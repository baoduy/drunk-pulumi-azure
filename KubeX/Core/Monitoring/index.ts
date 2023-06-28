import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import NginxIngress from '../../../KubeX/Ingress/NginxIngress';
import { applyDeploymentRules } from '../SecurityRules';
import Namespace from '../Namespace';
import { getTlsName } from '../../CertHelper';
import { getRootDomainFromUrl } from '../../../Common/Helpers';
import { randomPassword } from '../../../Core/Random';
import IdentityCreator from '../../../AzAd/Identity';
import { KeyVaultInfo } from '../../../types';
import { Input, Resource } from '@pulumi/pulumi';
import { tenantId } from '../../../Common/AzureEnv';

interface IdentityProps {
  name: string;
  callbackUrl: string;
  vaultInfo?: KeyVaultInfo;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

const createIdentity = async ({
  callbackUrl,
  name,
  vaultInfo,
}: IdentityProps) => {
  //Create Azure AD Identity for Authentication
  return await IdentityCreator({
    name,

    appRoleAssignmentRequired: true,
    appRoles: [
      {
        id: '819acdc5-3b86-4a9e-a6ea-1ce87b229ce6',
        allowedMemberTypes: ['User'],
        description: 'Grafana org admin Users',
        displayName: 'Grafana Org Admin',
        enabled: true,
        value: 'Admin',
      },
      {
        id: '225f546a-935c-4552-b2f5-97ae976f14e7',
        allowedMemberTypes: ['User'],
        description: 'Grafana read only Users',
        displayName: 'Grafana Viewer',
        enabled: true,
        value: 'Viewer',
      },
      {
        id: 'a482ac2e-68f1-4655-8875-2e84b9f13ef9',
        allowedMemberTypes: ['User'],
        description: 'Grafana Editor Users',
        displayName: 'Grafana Editor',
        enabled: true,
        value: 'Editor',
      },
    ],

    // requiredResourceAccesses: [
    //   getGraphPermissions({ name: 'User.Read', type: 'Scope' }),
    // ],

    createClientSecret: true,
    createPrincipal: false,

    appType: 'web',
    replyUrls: [callbackUrl],
    vaultInfo,
  });
};

export interface MonitoringProps {
  namespace?: string;
  provider: k8s.Provider;
  nodeSelector?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;

  enablePrometheus?: boolean;
  enableGrafana?: {
    hostName: string;
    auth?: {
      azureAD?: boolean;
    };
  };
  enableAlertManager?: boolean;

  vaultInfo?: KeyVaultInfo;
  dependsOn?:
    | pulumi.Input<pulumi.Input<pulumi.Resource>[]>
    | pulumi.Input<pulumi.Resource>;
}

export default async ({
  namespace = 'monitoring',
  /**Select AKS node that is not Virtual Node*/
  nodeSelector = {},

  enableAlertManager = false,
  enablePrometheus = true,
  enableGrafana,

  vaultInfo,
  provider,
}: MonitoringProps) => {
  const name = 'prometheus';
  //TODO: Setup grafana with Azure AD authentication

  //Sample https://github.com/fabianlee/k3s-cluster-kvm/blob/main/roles/kube-prometheus-stack/files/prom-sparse.expanded.yaml
  /** https://github.com/cablespaghetti/k3s-monitoring
   *
   * Monitor Rules Creating issue
   *    - kubectl delete  validatingwebhookconfigurations.admissionregistration.k8s.io prometheus-prometheus-oper-admission
   *    - kubectl delete  MutatingWebhookConfiguration  prometheus-prometheus-oper-admission
   *
   * kube-proxy issue refer here: https://github.com/prometheus-community/helm-charts/blob/61e7d540b686fa0df428933a42136f7084223ee2/charts/kube-prometheus-stack/README.md
   */

  const rootUrl = `https://${enableGrafana?.hostName}`;
  const ns = Namespace({ name: namespace, provider });
  const password = randomPassword({ name, policy: 'yearly' }).result;
  const adIdentity = Boolean(enableGrafana?.auth?.azureAD)
    ? await createIdentity({
        name,
        callbackUrl: `${rootUrl}/login/azuread`,
        vaultInfo,
      })
    : undefined;

  const prometheus = new k8s.helm.v3.Chart(
    name,
    {
      chart: 'kube-prometheus-stack',
      namespace,
      fetchOpts: { repo: 'https://prometheus-community.github.io/helm-charts' },
      values: {
        defaultRules: {
          create: enablePrometheus,
          rules: {
            alertmanager: enableAlertManager,
            etcd: false,
            configReloaders: false,
            general: true,
            k8s: false,
            kubeApiserverAvailability: false,
            kubeApiserverBurnrate: false,
            kubeApiserverHistogram: true,
            kubeApiserverSlos: false,
            kubeControllerManager: false,
            kubelet: false,
            kubeProxy: false,
            kubePrometheusGeneral: enablePrometheus,
            kubePrometheusNodeRecording: enablePrometheus,
            kubernetesApps: enablePrometheus,
            kubernetesResources: enablePrometheus,
            kubernetesStorage: enablePrometheus,
            kubernetesSystem: enablePrometheus,
            kubeSchedulerAlerting: enableAlertManager,
            kubeSchedulerRecording: enablePrometheus,
            kubeStateMetrics: enablePrometheus,
            network: enablePrometheus,
            node: enablePrometheus,
            nodeExporterAlerting: enableAlertManager,
            nodeExporterRecording: enablePrometheus,
            prometheus: enablePrometheus,
            prometheusOperator: enablePrometheus,
          },
        },

        //Required for use in managed kubernetes clusters (such as AWS EKS) with custom CNI (such as calico),
        //because control-plane managed by AWS cannot communicate with pods' IP CIDR and admission webhooks are not working
        hostNetwork: false,
        nodeSelector,

        coreDns: { enabled: enablePrometheus },
        kubeDns: { enabled: false },
        kubelet: { enabled: false },
        //Disable etcd monitoring. See https://github.com/cablespaghetti/k3s-monitoring/issues/4
        kubeEtcd: { enabled: false },
        //Disable kube-controller-manager and kube-scheduler monitoring. See https://github.com/cablespaghetti/k3s-monitoring/issues/2
        kubeControllerManager: { enabled: false },
        kubeScheduler: { enabled: false },
        kubeProxy: { enabled: false },
        kubernetesServiceMonitors: { enabled: enablePrometheus },
        kubeApiServer: { enabled: enablePrometheus },
        kubeletService: { enabled: enablePrometheus },
        kubeStateMetrics: { enabled: enablePrometheus },
        nodeExporter: { enabled: enablePrometheus },
        networkPolicy: { enabled: false },

        prometheus: { enabled: enablePrometheus },
        prometheusOperator: { enabled: enablePrometheus },
        prometheusSpec: {
          retention: '7d',
          storageSpec: {
            volumeClaimTemplate: {
              spec: {
                accessModes: ['ReadWriteOnce'],
                resources: {
                  requests: {
                    storage: '5Gi',
                  },
                },
              },
            },
          },
        },

        grafana: {
          enabled: Boolean(enableGrafana),
          adminPassword: password,
          plugins: ['grafana-piechart-panel'],

          env: {
            GF_SERVER_ROOT_URL: rootUrl,
            GF_SERVER_DOMAIN: enableGrafana?.hostName,
            GF_SERVER_SERVE_FROM_SUB_PATH: 'true',
          },
        },

        alertmanager: {
          enabled: enableAlertManager,
          // config: {
          //   global: {
          //     smtp_from: 'you@gmail.com',
          //     smtp_smarthost: 'mailhog:1025',
          //     smtp_require_tls: false,
          //   },
          //   route: {
          //     group_by: ['job'],
          //     group_wait: '30s',
          //     group_interval: '5m',
          //     repeat_interval: '1h',
          //     receiver: 'email',
          //     routes: [
          //       {
          //         match: {
          //           alertname: 'Watchdog',
          //         },
          //         receiver: 'null',
          //       },
          //       {
          //         match: {
          //           alertname: 'CPUThrottlingHigh',
          //         },
          //         receiver: 'null',
          //       },
          //       {
          //         match: {
          //           alertname: 'KubeMemoryOvercommit',
          //         },
          //         receiver: 'null',
          //       },
          //       {
          //         match: {
          //           alertname: 'KubeCPUOvercommit',
          //         },
          //         receiver: 'null',
          //       },
          //       {
          //         match: {
          //           alertname: 'KubeletTooManyPods',
          //         },
          //         receiver: 'null',
          //       },
          //     ],
          //   },
          //   receivers: [
          //     {
          //       name: 'null',
          //     },
          //     {
          //       name: 'email',
          //       email_configs: [
          //         {
          //           send_resolved: true,
          //           to: 'youremail@gmail.com',
          //         },
          //       ],
          //     },
          //   ],
          //   //Inhibition rules allow to mute a set of alerts given that another alert is firing.
          //   //We use this to mute any warning-level notifications if the same alert is already critical.
          //   inhibit_rules: [
          //     {
          //       source_match: {
          //         severity: 'critical',
          //       },
          //       target_match: {
          //         severity: 'warning',
          //       },
          //       equal: ['alertname', 'namespace'],
          //     },
          //   ],
          // },
          // alertmanagerSpec: {
          //   storage: {
          //     volumeClaimTemplate: {
          //       spec: {
          //         accessModes: ['ReadWriteOnce'],
          //         resources: {
          //           requests: {
          //             storage: '1Gi',
          //           },
          //         },
          //       },
          //     },
          //   },
          // },
        },

        ingress: { enabled: false },
        ingressPerReplica: { enabled: false },
      },
      transformations: [
        (obj) => {
          applyDeploymentRules(obj, { ignoredKinds: ['Job'] });

          //Enable OpenID auth for grafana
          if (
            enableGrafana?.auth &&
            obj.kind === 'ConfigMap' &&
            obj.metadata.name === 'prometheus-grafana'
          ) {
            //Azure AD
            if (enableGrafana.auth.azureAD) {
              let current: string = obj.data['grafana.ini'];
              obj.data['grafana.ini'] = pulumi.interpolate`
${current}

[auth]
azure_auth_enabled = true
disable_login_form = true

[auth.anonymous]
enabled = false

[auth.basic]
enabled = false
    
[auth.azuread]
name = Azure AD
enabled = true
allow_sign_up = true
auto_login = true
client_id = ${adIdentity?.clientId}
client_secret = ${adIdentity?.clientSecret ?? ''}
scopes = openid email profile
auth_url = https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize
token_url = https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token
allowed_domains =
allowed_groups =
allowed_organizations = ${tenantId}
role_attribute_strict = true
allow_assign_grafana_admin = false
skip_org_role_sync = false
use_pkce = false
force_use_graph_api = false

              `;
            }
          }
        },
      ],
    },
    { provider, dependsOn: ns }
  );

  if (enableGrafana) {
    NginxIngress({
      name: 'prometheus-grafana',
      hostNames: [enableGrafana.hostName],
      certManagerIssuer: true,
      className: 'nginx',
      tlsSecretName: getTlsName(
        getRootDomainFromUrl(enableGrafana.hostName),
        true
      ),

      service: {
        metadata: {
          name: pulumi.interpolate`prometheus-grafana`,
          namespace,
        },
        spec: { ports: [{ port: 80 }] },
      },

      dependsOn: prometheus,
      provider,
    });
  }

  return prometheus;
};
