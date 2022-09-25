import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import { getKubeDomainCert } from './Helpers';
import { replaceAll } from '../Common/Helpers';
import { envDomain } from '../Common/AzureEnv';

export const getTlsName = (domain: string, enableCertIssuer: boolean) =>
  enableCertIssuer
    ? `tls-${replaceAll(domain, '.', '-')}-lets`
    : `tls-${replaceAll(domain, '.', '-')}-imported`;

interface Props {
  namespaces: Input<string>[];
  provider: k8s.Provider;
}

export default async ({ namespaces, provider }: Props) => {
  const cert = await getKubeDomainCert();
  if (!cert) return;

  namespaces.map((n, i) => {
    const name = getTlsName(envDomain, false);

    return new k8s.core.v1.Secret(
      `${name}-${i}`,
      {
        metadata: {
          name,
          namespace: n,
        },
        type: 'kubernetes.io/tls',
        stringData: {
          'tls.crt': cert.cert + cert.ca,
          'tls.key': cert.key,
        },
      },
      { provider }
    );
  });
};
