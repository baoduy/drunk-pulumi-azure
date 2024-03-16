import { DefaultK8sArgs } from '../types';
import { all, Input } from '@pulumi/pulumi';
import KsSecret from './KsSecret';

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

    return KsSecret({
      name: `${name}-${ns}`,
      namespace: ns,
      type: 'kubernetes.io/tls',
      stringData,
      ...others,
    });
  });
