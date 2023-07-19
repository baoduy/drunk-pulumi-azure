import { DefaultK8sArgs, K8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';
import { getTlsName } from '../../CertHelper';

export interface LocalStackProps extends DefaultK8sArgs {
  domain: string;
}

export default ({
  name = 'localstack',
  namespace,
  domain,
  provider,
}: LocalStackProps) => {
  const localStack = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'localstack',
      fetchOpts: { repo: 'https://helm.localstack.cloud' },

      values: {
        ingress: {
          enabled: true,
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            'kubernetes.io/tls-acme': 'true',
          },
          hosts: [
            {
              host: `aws.${domain}`,
              paths: [{ path: '/', pathType: 'ImplementationSpecific' }],
            },
          ],
          tls: [{ secretName: getTlsName(name, true) }],
        },
      },
    },
    { provider }
  );

  return localStack;
};
