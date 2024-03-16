import { AzureFileStorageClassProps, RunAsType } from './azureFile';
import { AzureBlobStorageClassProps } from './azureBlob';

import AzureFileStorageClass from './azureFile';
import AzureBlobStorageClass from './azureBlob';
import * as k8s from '@pulumi/kubernetes';

export interface StorageClassProps
  extends Omit<AzureFileStorageClassProps, 'mountOptions'>,
    Pick<AzureBlobStorageClassProps, 'fuse' | 'nfs'> {
  azureFile?: {
    mountOptions?: RunAsType;
  };
}

export default ({ azureFile, fuse, nfs, ...others }: StorageClassProps) => {
  let azureFileStorageClass: k8s.storage.v1.StorageClass | undefined =
    undefined;
  let azureBlobFuseStorageClass: k8s.storage.v1.StorageClass | undefined =
    undefined;
  let azureBlobNfsStorageClass: k8s.storage.v1.StorageClass | undefined =
    undefined;

  if (azureFile)
    azureFileStorageClass = AzureFileStorageClass({
      ...others,
      mountOptions: azureFile.mountOptions,
    });

  if (fuse || nfs) {
    const rs = AzureBlobStorageClass({ ...others, fuse, nfs });
    azureBlobFuseStorageClass = rs.fuseStorageClass;
    azureBlobNfsStorageClass = rs.nfsStorageClass;
  }

  return {
    azureFileStorageClass,
    azureBlobFuseStorageClass,
    azureBlobNfsStorageClass,
  };
};
