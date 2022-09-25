import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as path from 'path';
import { Input, Resource } from '@pulumi/pulumi';
import { subscriptionId, tenantId } from '../../../Common/AzureEnv';
import * as global from '../../../Common/GlobalEnv';

export interface CertManagerProps {
  name: string;
  namespace?: pulumi.Input<string>;
  email: string;
  version?: string;

  http01Issuer?: { publicIngressClass: string; domains?: string[] };

  azureDnsIssuer?: {
    dnsZoneName: string;
    clientId: string;
    clientSecret: string;
  };

  provider: k8s.Provider;
  dependsOn?: pulumi.Input<pulumi.Input<Resource>[]> | pulumi.Input<Resource>;
}

//run this `kubectl patch crd challenges.acme.cert-manager.io -p '{"metadata":{"finalizers": []}}' --type=merge` if stuck at removing challenges.acme.cert-manager.io
export default async ({
  name,
  namespace = 'cert-manager',
  version,
  provider,
  email,

  http01Issuer,
  azureDnsIssuer,
  dependsOn,
}: CertManagerProps) => {
  const certManager = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'cert-manager',
      version,
      fetchOpts: { repo: 'https://charts.jetstack.io' },

      values: {
        installCRDs: true,
        ingressShim: {
          defaultIssuerName: 'letsencrypt-prod',
          defaultIssuerKind: 'ClusterIssuer',
          defaultIssuerGroup: 'cert-manager.io',
        },

        // extraArgs: {
        //   '--dns01-recursive-nameservers-only': 'true',
        //   '--dns01-recursive-nameservers': '8.8.8.8:53,1.1.1.1:53',
        // },
        //nodeSelector: { 'kubernetes.io/os': 'linux' },
      },
    },
    {
      provider,
      dependsOn,
    }
  );

  if (http01Issuer) {
    new k8s.yaml.ConfigFile(
      `cluster-issuer`,
      {
        file: path.resolve(__dirname, 'cluster-issuer.yaml'),
        transformations: [
          (obj) => {
            obj.metadata.namespace = namespace;
            obj.spec.acme.email = email;

            obj.spec.acme.solvers = [
              {
                http01: {
                  ingress: {
                    class: http01Issuer.publicIngressClass,
                    podTemplate: {
                      spec: { nodeSelector: { 'kubernetes.io/os': 'linux' } },
                    },
                  },
                  selector: http01Issuer.domains
                    ? { dnsZones: http01Issuer.domains }
                    : undefined,
                },
              },
            ];
          },
        ],
      },
      { provider, dependsOn: [certManager] }
    );
  }

  if (azureDnsIssuer) {
    new k8s.core.v1.Secret(
      `${name}-identity`,
      {
        metadata: {
          name: `${name}-identity`,
          namespace,
        },
        stringData: {
          clientId: azureDnsIssuer.clientId,
          clientSecret: azureDnsIssuer.clientSecret,
        },
      },
      { provider, dependsOn: [certManager] }
    );

    new k8s.yaml.ConfigFile(
      'cluster-issuer-azdns',
      {
        file: path.resolve(__dirname, 'cluster-issuer-azdns.yaml'),
        transformations: [
          (o) => {
            o.metadata.namespace = namespace;
            o.spec.acme.email = email;
            const providers = o.spec.acme.solvers as Array<{
              dns01: {
                azuredns: {
                  clientID: Input<string>;
                  subscriptionID: Input<string>;
                  tenantID: Input<string>;
                  resourceGroupName: Input<string>;
                  hostedZoneName: Input<string>;
                };
              };
            }>;

            providers.forEach((p) => {
              p.dns01.azuredns.clientID = azureDnsIssuer.clientId;
              p.dns01.azuredns.hostedZoneName = azureDnsIssuer.dnsZoneName;
              p.dns01.azuredns.resourceGroupName =
                global.groupInfo.resourceGroupName;
              p.dns01.azuredns.subscriptionID = subscriptionId;
              p.dns01.azuredns.tenantID = tenantId;
            });
          },
        ],
      },
      { provider, dependsOn: [certManager] }
    );
  }

  return certManager;
};
