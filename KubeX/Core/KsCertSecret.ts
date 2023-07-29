import { DefaultK8sArgs } from '../types';
import * as k8s from '@pulumi/kubernetes';

interface CertSecretProps extends Omit<DefaultK8sArgs, 'namespace'> {
  namespace: string;
  cert: string;
  ca?: string;
  privateKey: string;
}

export default ({
  name,
  namespace,
  cert,
  ca,
  privateKey,
  ...others
}: CertSecretProps) =>
  new k8s.core.v1.Secret(
    `${name}-${namespace}`,
    {
      metadata: {
        name,
        namespace,
      },
      type: 'kubernetes.io/tls',
      stringData: {
        'tls.crt': ca ? cert + ca : cert,
        'tls.key': privateKey,
      },
    },
    others
  );
