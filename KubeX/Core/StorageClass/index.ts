import { DefaultAksArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';

export interface StorageClassProps extends Omit<DefaultAksArgs, 'namespace'> {
  provisioner?: 'disk.csi.azure.com';
  skuName?: 'Premium_LRS' | 'StandardSSD_LRS';
}

export default ({
  name,
  provisioner = 'disk.csi.azure.com',
  skuName = 'Premium_LRS',
  provider,
}: StorageClassProps) => {
  const sc = new k8s.storage.v1.StorageClass(
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

  return sc;
};
