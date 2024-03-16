import { DefaultK8sArgs } from '../types';
import * as k8s from '@pulumi/kubernetes';

export type ResourceQuotaSpec = {
  cpu: string;
  memory: string;
  pods: string;
  persistentvolumeclaims: string;
};

interface Props extends DefaultK8sArgs {
  spec: ResourceQuotaSpec;
}

export default ({
  name = 'resource-quota',
  namespace,
  spec,
  ...others
}: Props) =>
  new k8s.core.v1.ResourceQuota(
    name,
    {
      metadata: {
        name,
        namespace,
      },
      spec: {
        hard: spec,
      },
    },
    others
  );
