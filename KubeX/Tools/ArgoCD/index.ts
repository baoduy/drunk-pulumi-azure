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
} from '../../../Common/Helpers';
import { IngressProps } from '../../Ingress/type';
import * as console from 'console';
import { createPVCForStorageClass, StorageClassNameTypes } from '../../Storage';
import identityCreator from '../../../AzAd/Identity';
import { KeyVaultInfo } from '../../../types';
import { tenantId } from '../../../Common/AzureEnv';

interface Props extends K8sArgs {
  name?: string;
  namespace?: string;
  storageClassName: StorageClassNameTypes;
  auth?: {
    enableAzureAD?: boolean;
  };
  ingressConfig?: DeploymentIngress;
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

  const pluginsVolume = createPVCForStorageClass({
    name: `${name}-plugins`,
    namespace,
    ...others,
    storageClassName,
  });

  const tmpVolume = createPVCForStorageClass({
    name: `${name}-tmp`,
    namespace,
    ...others,
    storageClassName,
  });

  const identity = auth?.enableAzureAD
    ? await identityCreator({
        name,
        createClientSecret: true,
        createPrincipal: true,
        publicClient: false,
        allowImplicit: true,
        replyUrls: [
          `https://${ingressConfig?.hostNames[0]}/argo-cd/auth/callback`,
        ],
        vaultInfo,
      })
    : undefined;

  const argo = new k8s.yaml.ConfigFile(
    name,
    {
      skipAwait: true,
      file: 'https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml',
      transformations: [
        (o, op) => {
          if (o.metadata) o.metadata.namespace = namespace;

          if (o.kind === 'Deployment' && o.metadata.name === 'argocd-server') {
            o.spec.template.spec.volumes.forEach((v: any, i: number) => {
              if (v.emptyDir && v.name === 'plugins-home') {
                delete v.emptyDir;

                if (v.name === 'plugins-home')
                  v.persistentVolumeClaim = {
                    claimName: pluginsVolume.metadata.name,
                  };
                else if (v.name === 'tmp')
                  v.persistentVolumeClaim = {
                    claimName: tmpVolume.metadata.name,
                  };
                else console.log(v);
              }

              //Map Azure AD Auth to argo server
              if (identity) {
                //Update ConfigMap
                if (o.kind === 'ConfigMap' && o.metadata.name === 'argocd-cm') {
                  o.data = {
                    url: `https://${ingressConfig?.hostNames[0]}`,
                    'oidc.config': interpolate`name: Azure\\nissuer: https://login.microsoftonline.com/${tenantId}/v2.0\\nclientID: ${identity.clientId}\\nclientSecret:$oidc.azure.clientSecret\\nrequestedIDTokenClaims:\\n   groups:\\n      essential: true\\nrequestedScopes:\\n   - openid\\n   - profile\\n   - email\\n`,
                  };
                }
                //Update Secret
                if (
                  o.kind === 'Secret' &&
                  o.metadata.name === 'argocd-secret'
                ) {
                  o.stringData['oidc.azure.clientSecret'] =
                    identity.clientSecret;
                }
                //Update Roles
                if (
                  o.kind === 'ConfigMap' &&
                  o.metadata.name === 'argocd-rbac-cm'
                ) {
                  o.stringData = {
                    'policy.default': 'role:readonly',
                    scopes: '[groups, email]',
                    'policy.csv':
                      'p, role:org-admin, applications, *, */*, allow\np, role:org-admin, clusters, get, *, allow\np, role:org-admin, repositories, get, *, allow\np, role:org-admin, repositories, create, *, allow\np, role:org-admin, repositories, update, *, allow\np, role:org-admin, repositories, delete, *, allow\ng, 84ce98d1-e359-4f3b-85af-985b458de3c6, role:org-admin\n',
                  };
                }
              }
            });
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

      proxy: { backendProtocol: 'HTTPS' },
      pathType: 'Prefix',
      service: {
        metadata: { name: 'argocd-server', namespace },
        spec: { ports: [{ name: 'https' }] },
      },
      ...others,
      dependsOn: argo,
    };

    NginxIngress(ingressProps);
  }
  return argo;
};
