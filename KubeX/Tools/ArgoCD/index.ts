import { K8sArgs } from '../../types';
import Namespace from '../../Core/Namespace';
import * as k8s from '@pulumi/kubernetes';
import { DeploymentIngress, IngressTypes } from '../../Deployment';
import { NginxIngress } from '../../Ingress';
import { output, interpolate } from '@pulumi/pulumi';
import { getTlsName } from '../../CertHelper';
import {
  getDomainFromUrl,
  getRootDomainFromUrl,
  toBase64,
} from '../../../Common/Helpers';
import { IngressProps } from '../../Ingress/type';
import * as console from 'console';
import { createPVCForStorageClass, StorageClassNameTypes } from '../../Storage';
import identityCreator from '../../../AzAd/Identity';
import { KeyVaultInfo } from '../../../types';
import { tenantId } from '../../../Common/AzureEnv';
import { randomPassword } from '../../../Core/Random';

interface Props extends K8sArgs {
  name?: string;
  namespace?: string;
  storageClassName: StorageClassNameTypes;
  auth?: {
    enableAzureAD?: boolean;
  };
  ingressConfig?: { hostName: string } & Omit<DeploymentIngress, 'hostNames'>;
  vaultInfo?: KeyVaultInfo;
}

export default async ({
  name = 'argo-cd',
  namespace = 'argo-cd',
  ingressConfig,
  auth,
  storageClassName,
  vaultInfo,
  ...others
}: Props) => {
  const ns = Namespace({ name, ...others });

  const identity = auth?.enableAzureAD
    ? await identityCreator({
        name,
        createClientSecret: true,
        createPrincipal: true,
        publicClient: false,
        allowImplicit: true,
        replyUrls: [`https://${ingressConfig?.hostName}/argo-cd/auth/callback`],
        vaultInfo,
      })
    : undefined;

  const argoCD = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'argo-cd',
      fetchOpts: { repo: 'https://charts.bitnami.com/bitnami' },
      skipAwait: true,

      values: {
        global: {
          storageClass: storageClassName,
        },
        rbac: { create: true },
        // redis: {
        //   auth: {
        //     existingSecret: randomPassword({
        //       name: `${name}-redis-pass`,
        //       policy: false,
        //     }).result,
        //   },
        // },
        server: {},
      },
      transformations: [
        (o) => {
          if (o.kind === 'Secret' && o.metadata.name === 'argocd-secret') {
            o.data['server.secretkey'] = randomPassword({
              name: `${name}-secretkey`,
              policy: false,
            }).result.apply(toBase64);
          }
        },
      ],
    },
    { dependsOn: ns, provider: others.provider }
  );

  if (ingressConfig) {
    const ingressProps: IngressProps = {
      ...ingressConfig,
      className: ingressConfig.className || 'nginx',

      name: `${name}-ingress`.toLowerCase(),
      hostNames: [ingressConfig.hostName],

      tlsSecretName:
        ingressConfig.tlsSecretName ||
        getTlsName(
          ingressConfig.certManagerIssuer
            ? getDomainFromUrl(ingressConfig.hostName)
            : getRootDomainFromUrl(ingressConfig.hostName),
          Boolean(ingressConfig.certManagerIssuer)
        ),

      proxy: { backendProtocol: 'HTTPS' },
      pathType: 'ImplementationSpecific',
      service: {
        metadata: { name: 'argo-cd-server', namespace },
        spec: { ports: [{ name: 'https' }] },
      },
      ...others,
      dependsOn: ns,
    };

    NginxIngress(ingressProps);
  }
};
