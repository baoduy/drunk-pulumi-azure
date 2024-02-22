import { DefaultK8sArgs } from '../types';
import * as k8s from '@pulumi/kubernetes';
import { all, Input } from '@pulumi/pulumi';

interface CertSecretProps extends DefaultK8sArgs {
  certInfo: Input<{
    cert: Input<string>;
    ca?: Input<string>;
    privateKey: Input<string>;
    dhparam?: Input<string>;
  }>;
}

export default ({ name, namespace, certInfo, ...others }: CertSecretProps) =>
  all([namespace, certInfo]).apply(([ns, info]) => {
    const stringData: { [key: string]: string } = {
      'tls.crt': info.cert,
      'tls.key': info.privateKey,
    };

    if (info.ca) stringData['tls.ca'] = info.ca;
    if (info.dhparam) stringData['tls.dhparam'] = info.dhparam;

    return new k8s.core.v1.Secret(
      `${name}-${ns}`,
      {
        metadata: {
          name,
          namespace: ns,
        },
        type: 'kubernetes.io/tls',
        stringData,
      },
      others
    );
  });
