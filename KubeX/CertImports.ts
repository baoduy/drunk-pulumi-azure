import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import { getKubeDomainCert } from './Helpers';
import { getTlsName } from './CertHelper';

interface Props {
  namespaces: Input<string>[];
  domainName: string;
  provider: k8s.Provider;
}

export default async ({ namespaces, domainName, provider }: Props) => {
  const cert = await getKubeDomainCert(domainName);
  if (!cert) return;

  namespaces.map((n, i) => {
    const name = getTlsName(domainName, false);

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
