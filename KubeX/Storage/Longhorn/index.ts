import { DefaultK8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';
import Namespace from '../../Core/Namespace';

export interface LonghornProps
  extends Omit<DefaultK8sArgs, 'name' | 'namespace'> {}

//https://github.com/longhorn/longhorn/blob/master/chart/values.yaml
export default ({ resources, ...others }: LonghornProps) => {
  const name = 'gitea-runner';
  const namespace = 'longhorn-system';

  const ns = Namespace({ name: namespace, ...others });

  return new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'longhorn',
      fetchOpts: { repo: 'https://charts.longhorn.io' },

      values: {
        csi: { kubeletRootDir: '/var/lib/kubelet' },
        defaultSettings: {
          replicaSoftAntiAffinity: true,
          replicaZoneSoftAntiAffinity: true,
          createDefaultDiskLabeledNodes: true,
          defaultReplicaCount: 2,
          defaultLonghornStaticStorageClass: 'longhorn-static-storageclass',
          guaranteedEngineCPU: 0.1,
          diskType: 'flesystem',
        },
      },
    },
    { ...others, dependsOn: ns }
  );
};
