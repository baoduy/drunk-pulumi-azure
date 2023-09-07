import { DefaultK8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import * as pulumi from '@pulumi/pulumi';
import { organization } from '../../../Common/StackEnv';

export const defaultBlobFuseMountOptions = [
  '-o allow_other',
  '--file-cache-timeout-in-seconds=120',
  '--use-attr-cache=true',
  '--cancel-list-on-mount-seconds=10',
  '-o attr_timeout=120',
  '-o entry_timeout=120',
  '-o negative_timeout=120',
  '--log-level=LOG_WARNING',
  '--cache-size-mb=1000',
];

export const defaultBlobNfsMountOptions = [
  '-o allow_other',
  '--file-cache-timeout-in-seconds=120',
  '--use-attr-cache=true',
  '--cancel-list-on-mount-seconds=10',
  '-o attr_timeout=120',
  '-o entry_timeout=120',
  '-o negative_timeout=120',
  '--log-level=LOG_WARNING',
  '--cache-size-mb=1000',
];

export interface AzureBlobStorageClassProps
  extends Omit<DefaultK8sArgs, 'name' | 'namespace'> {
  isDefault?: boolean;
  skuName: 'Premium_LRS' | 'Standard_LRS' | 'StandardSSD_LRS';
  storageAccount: Input<string>;
  fuse?: {
    mountOptions?: Input<string>[];
  };
  nfs?: {
    mountOptions?: Input<string>[];
  };
}

export default ({
  fuse,
  nfs,
  storageAccount,
  skuName,
  isDefault,
  ...others
}: AzureBlobStorageClassProps) => {
  const nfsname = `${organization}-azureblob-nfs-${skuName.replace(
    '_',
    '-'
  )}`.toLowerCase();
  const fusename = `${organization}-azureblob-fuse-${skuName.replace(
    '_',
    '-'
  )}`.toLowerCase();

  const provisioner = 'blob.csi.azure.com';

  let fuseStorageClass: k8s.storage.v1.StorageClass | undefined = undefined;
  let nfsStorageClass: k8s.storage.v1.StorageClass | undefined = undefined;

  if (fuse)
    fuseStorageClass = new k8s.storage.v1.StorageClass(
      fusename,
      {
        metadata: {
          name: fusename,
          annotations: isDefault
            ? {
                'storageclass.kubernetes.io/is-default-class': 'true',
              }
            : undefined,
        },
        provisioner,
        allowVolumeExpansion: true,
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'Immediate',
        parameters: {
          storageAccount,
          skuName,
        },
        mountOptions: defaultBlobFuseMountOptions,
      },
      others
    );

  if (nfs)
    nfsStorageClass = new k8s.storage.v1.StorageClass(
      nfsname,
      {
        metadata: {
          name: nfsname,
          annotations: isDefault
            ? {
                'storageclass.kubernetes.io/is-default-class': 'true',
              }
            : undefined,
        },
        provisioner,
        allowVolumeExpansion: true,
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'Immediate',
        parameters: {
          protocol: 'nfs',
          storageAccount,
          skuName,
        },
        //mountOptions: defaultBlobFuseMountOptions,
      },
      others
    );

  return { fuseStorageClass, nfsStorageClass };
};
