import { DefaultK8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';

export interface StorageClassProps extends Omit<DefaultK8sArgs, 'namespace'> {
  provisioner?: 'disk.csi.azure.com';
  skuName?: 'Premium_LRS' | 'StandardSSD_LRS';
}

export default ({
  name = 'storage-class',
  provisioner = 'disk.csi.azure.com',
  skuName = 'Premium_LRS',
  provider,
}: StorageClassProps) =>
  new k8s.storage.v1.StorageClass(
    name,
    {
      metadata: { name },
      provisioner,
      allowVolumeExpansion: true,
      reclaimPolicy: 'Delete',
      volumeBindingMode: 'Immediate',
      parameters: { skuname: skuName },
    },
    { provider }
  );
