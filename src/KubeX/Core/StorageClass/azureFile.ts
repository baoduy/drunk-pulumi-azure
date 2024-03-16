import { DefaultK8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import * as pulumi from '@pulumi/pulumi';
import { organization } from '../../../Common/StackEnv';

/** Sample mount options of the AzureFile*/
export type RunAsType = {
  runAsUser: number;
  runAsGroup: number;
};

export const defaultAzureFileMountOptions = [
  'mfsymlinks',
  'cache=strict',
  'nosharesock',
];
export const getAzureFileMountOptions = ({
  runAsUser,
  runAsGroup,
}: RunAsType) => [
  'dir_mode=0777',
  'file_mode=0777',
  `uid=${runAsUser}`,
  `gid=${runAsGroup}`,
  'mfsymlinks',
  'cache=strict',
  'nosharesock',
];

export interface AzureFileStorageClassProps
  extends Omit<DefaultK8sArgs, 'name' | 'namespace'> {
  isDefault?: boolean;
  storageAccount: Input<string>;
  skuName: 'Premium_LRS' | 'Standard_LRS' | 'StandardSSD_LRS';
  mountOptions?: RunAsType;
}

export default ({
  skuName,
  mountOptions,
  storageAccount,
  isDefault,
  ...others
}: AzureFileStorageClassProps) => {
  const name = `${organization}-azurefile-${skuName.replace(
    '_',
    '-'
  )}`.toLowerCase();

  return new k8s.storage.v1.StorageClass(
    name,
    {
      metadata: {
        name,
        annotations: isDefault
          ? {
              'storageclass.kubernetes.io/is-default-class': 'true',
            }
          : undefined,
      },
      provisioner: 'file.csi.azure.com',
      allowVolumeExpansion: true,
      reclaimPolicy: 'Delete',
      volumeBindingMode: 'Immediate',
      parameters: {
        storageAccount,
        skuName,
      },
      mountOptions: mountOptions
        ? getAzureFileMountOptions(mountOptions)
        : defaultAzureFileMountOptions,
    },
    others
  );
};
