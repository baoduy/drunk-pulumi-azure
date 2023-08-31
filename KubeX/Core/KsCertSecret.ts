import { DefaultK8sArgs } from '../types';
import * as k8s from '@pulumi/kubernetes';
import { all, Input } from '@pulumi/pulumi';

interface CertSecretProps extends DefaultK8sArgs {
  cert: Input<string>;
  ca?: Input<string>;
  privateKey: Input<string>;
}

export default ({
  name,
  namespace,
  cert,
  ca,
  privateKey,
  ...others
}: CertSecretProps) =>
  all([namespace, cert, ca, privateKey]).apply(
    ([ns, c, a, key]) =>
      new k8s.core.v1.Secret(
        `${name}-${ns}`,
        {
          metadata: {
            name,
            namespace: ns,
          },
          type: 'kubernetes.io/tls',
          stringData: {
            'tls.crt': a ? c + a : c,
            'tls.key': key,
          },
        },
        others
      )
  );
