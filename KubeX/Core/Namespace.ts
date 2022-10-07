import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { DefaultK8sArgs } from '../types';

interface Props extends Omit<DefaultK8sArgs, 'namespace'> {
  labels?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
}

export default ({ name, labels, provider }: Props) => {
  labels = labels || {};

  // if (n.includes('nginx')) {
  //   l['cert-manager.io/disable-validation'] = 'true';
  // }

  return new k8s.core.v1.Namespace(
    name,
    {
      metadata: {
        name,
        namespace: name,
        labels: {
          name,
          ...labels,
        },
      },
    },
    { provider }
  );
};
