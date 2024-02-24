import * as k8s from '@pulumi/kubernetes';
import { DefaultK8sArgs } from '../types';
import { Input } from '@pulumi/pulumi';

export default ({
  name = 'Secret',
  namespace,
  type,
  stringData,
  ...others
}: DefaultK8sArgs & {
  type?: Input<string>;
  stringData: Input<{ [key: string]: Input<string> }>;
}) =>
  new k8s.core.v1.Secret(
    name,
    {
      metadata: {
        name,
        namespace,
      },
      type,
      stringData,
    },
    others
  );
