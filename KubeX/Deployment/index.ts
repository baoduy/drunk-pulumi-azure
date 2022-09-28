import * as k8s from '@pulumi/kubernetes';
import * as kx from '../KubX';
import { NginxIngress } from '../Ingress';
import { Input, output, Resource } from '@pulumi/pulumi';
import { getDomainFromUrl, getRootDomainFromUrl } from '../../Common/Helpers';
import { getTlsName } from '../CertHelper';
import { IngressProps } from '../Ingress/NginxIngress';
import * as pulumi from '@pulumi/pulumi';
import { input as inputs } from '@pulumi/kubernetes/types';
import { PodAutoScale, PodAutoScaleProps } from './PodAutoscaler';
import ConfigSecret from '../ConfigSecret';

type restartPolicies = 'Always' | 'OnFailure' | 'Never';

export const virtualHostConfig = {
  nodeSelector: {
    'kubernetes.io/role': 'agent',
    'beta.kubernetes.io/os': 'linux',
    type: 'virtual-kubelet',
  },
  tolerations: [
    {
      effect: 'NoSchedule',
      key: 'virtual-kubelet.io/provider',
      value: 'azure',
    },
  ],
};

interface PodConfigProps {
  port?: number;
  image: Input<string>;
  imagePullPolicy?: 'Always' | 'Never' | 'IfNotPresent';
  resources?: Input<k8s.types.input.core.v1.ResourceRequirements> | false;
  volumes?: Array<{
    name: string;
    mountPath: string;
    /** The secret name when mount to Azure Files*/
    secretName?: Input<string>;
    /** The volume claims name */
    persistentVolumeClaim?: Input<string>;
  }>;
  podSecurityContext?: Input<k8s.types.input.core.v1.SecurityContext>;
  securityContext?: Input<k8s.types.input.core.v1.PodSecurityContext>;
  tolerations?: pulumi.Input<inputs.core.v1.Toleration>[];
  nodeSelector?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
}

interface PodBuilderProps {
  name: string;
  envFrom: Array<k8s.types.input.core.v1.EnvFromSource>;
  useVirtualHost?: boolean;
  podConfig: PodConfigProps;
  args?: Input<string>[];
  restartPolicy?: restartPolicies;
}

const buildPod = ({
  name,
  envFrom,
  podConfig,
  useVirtualHost,
  restartPolicy,
  args,
}: PodBuilderProps) => {
  //console.log('buildPod', podConfig);
  if (useVirtualHost) {
    podConfig.nodeSelector = virtualHostConfig.nodeSelector;
    podConfig.tolerations = virtualHostConfig.tolerations;

    if (!podConfig.resources) podConfig.resources = false;
  }
  //else if (!podConfig.nodeSelector) podConfig.nodeSelector = { app: name };

  const resources =
    podConfig.resources === false
      ? undefined
      : podConfig.resources || {
          limits: { memory: '1Gi', cpu: '500m' },
          requests: { memory: '10Mi', cpu: '10m' },
        };

  return new kx.PodBuilder({
    terminationGracePeriodSeconds: 30,

    securityContext: podConfig.securityContext,
    automountServiceAccountToken: false,

    volumes: podConfig.volumes
      ? podConfig.volumes.map((v) => ({
          name: v.name.toLowerCase(),

          csi: v.secretName
            ? {
                driver: 'file.csi.azure.com',
                volumeAttributes: {
                  secretName: v.secretName,
                  shareName: v.name.toLowerCase(),
                  // mountOptions:
                  //   'dir_mode=0777,file_mode=0777,cache=strict,actimeo=30',
                },
              }
            : undefined,

          persistentVolumeClaim: v.persistentVolumeClaim
            ? { claimName: v.persistentVolumeClaim }
            : undefined,
        }))
      : undefined,

    containers: [
      {
        name,
        image: podConfig.image,
        imagePullPolicy: podConfig.imagePullPolicy,
        ports: { http: podConfig.port! },
        envFrom,

        securityContext: podConfig.podSecurityContext,
        resources,
        args,
        volumeMounts: podConfig.volumes
          ? podConfig.volumes.map((v) => ({
              name: v.name,
              mountPath: v.mountPath,
            }))
          : undefined,
      },
    ],
    restartPolicy,

    tolerations: podConfig.tolerations,
    nodeSelector: podConfig.nodeSelector,
  });
};

export type DeploymentIngress = Omit<
  IngressProps,
  'name' | 'internalIngress' | 'service' | 'provider' | 'dependsOn'
>;

interface Props {
  name: string;
  namespace: Input<string>;
  podConfig: PodConfigProps;

  deploymentConfig?: {
    args?: Input<string>[];
    replicas?: number;
    /** Run App and Jobs using Virtual Node **/
    useVirtualHost?: boolean;
  };

  serviceConfig?: {
    usePodPort?: boolean;
    port?: number;
    useClusterIP?: boolean;
  };

  jobConfigs?: Array<{
    name: string;
    /** Run Jobs using Virtual Node **/
    useVirtualHost?: boolean;
    /**If schedule provided the cron job will be created instead just a job*/
    cron?: {
      schedule: string;
      failedJobsHistoryLimit?: number;
      successfulJobsHistoryLimit?: number;
      concurrencyPolicy: 'Forbid' | 'Allow' | 'Replace';
    };

    args?: Input<string>[];
    restartPolicy?: restartPolicies;
    ttlSecondsAfterFinished?: number;
  }>;

  ingressConfig?: DeploymentIngress;

  configMap?: Input<{
    [key: string]: Input<string>;
  }>;
  secrets?: Input<{
    [key: string]: Input<string>;
  }>;

  /**
   * Enable high availability for the deployment. Multi instance of the pod will be scale up and down based on the usage.
   */
  enableHA?: Omit<PodAutoScaleProps, 'provider' | 'deployment'>;
  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default async ({
  name,
  namespace,

  configMap,
  secrets,

  podConfig,
  deploymentConfig = { replicas: 1 },
  serviceConfig,
  jobConfigs,
  ingressConfig,

  enableHA,
  provider,
  dependsOn,
}: Props) => {
  const configSecret = ConfigSecret({
    name,
    namespace,
    configMap,
    secrets,
    provider,
    dependsOn,
  });
  const envFrom = new Array<k8s.types.input.core.v1.EnvFromSource>();

  if (configSecret.config) {
    envFrom.push({
      configMapRef: { name: configSecret.config.metadata.name },
    });
  }

  if (configSecret.secret) {
    //Create Secrets
    envFrom.push({ secretRef: { name: configSecret.secret.metadata.name } });
  }

  if (!podConfig.port) podConfig.port = 8080;

  const deployment = new kx.Deployment(
    name,
    {
      metadata: { namespace, annotations: { 'pulumi.com/skipAwait': 'true' } },
      spec: buildPod({
        name,
        podConfig,
        envFrom,
        args: deploymentConfig.args,
        useVirtualHost: deploymentConfig.useVirtualHost,
      }).asDeploymentSpec({
        replicas: deploymentConfig.replicas,
        revisionHistoryLimit: 1,
      }),
    },
    {
      provider,
      dependsOn,
      deleteBeforeReplace: true,
      customTimeouts: { create: '10m', update: '10m' },
    }
  );

  //Jobs
  if (jobConfigs) {
    jobConfigs.map((job) => {
      if (job.cron)
        return new k8s.batch.v1.CronJob(
          job.name,
          {
            metadata: { namespace },
            spec: buildPod({
              name,
              podConfig,
              envFrom,
              useVirtualHost:
                job.useVirtualHost || deploymentConfig.useVirtualHost,
              args: job.args,
              restartPolicy: job.restartPolicy || 'Never',
            }).asCronJobSpec({
              failedJobsHistoryLimit: 1,
              successfulJobsHistoryLimit: 1,
              ...job.cron,
            }),
          },
          { provider }
        );

      return new kx.Job(
        job.name,
        {
          metadata: { namespace },
          spec: buildPod({
            name,
            podConfig,
            envFrom,
            useVirtualHost:
              job.useVirtualHost || deploymentConfig.useVirtualHost,
            args: job.args,
            restartPolicy: job.restartPolicy || 'Never',
          }).asJobSpec({
            ttlSecondsAfterFinished: job.ttlSecondsAfterFinished || 604800, //7 days
          }),
        },
        { provider }
      );
    });
  }

  const servicePort: any = {
    name: 'http',
    port: 80,
    targetPort: podConfig.port,
    protocol: 'TCP',
  };

  if (serviceConfig?.usePodPort) {
    servicePort.port = podConfig.port;
    //servicePort.targetPort = podConfig.port;
  } else if (serviceConfig?.port) {
    servicePort.port = serviceConfig.port;
    //servicePort.targetPort = podConfig.port;
  }

  //Service
  const service = deployment.createService({
    name,
    ports: [servicePort],
    type: serviceConfig?.useClusterIP ? 'LoadBalancer' : undefined,
  });

  //Ingress
  if (ingressConfig) {
    //Ingress
    NginxIngress({
      ...ingressConfig,
      className: ingressConfig.className || 'nginx',

      name: `${name}-ingress`.toLowerCase(),
      hostNames: ingressConfig.hostNames.map((host) =>
        output(host).apply((h) => h.toLowerCase().replace('https://', ''))
      ),
      tlsSecretName: ingressConfig.allowHttp
        ? undefined
        : ingressConfig.tlsSecretName ||
          output(ingressConfig.hostNames).apply((h) =>
            getTlsName(
              ingressConfig.certManagerIssuer
                ? getDomainFromUrl(h[0])
                : getRootDomainFromUrl(h[0]),
              Boolean(ingressConfig.certManagerIssuer)
            )
          ),

      service,
      provider,
      dependsOn,
    });
  }

  if (enableHA) {
    PodAutoScale({ ...enableHA, deployment, provider });
  }

  return { deployment, service };
};
