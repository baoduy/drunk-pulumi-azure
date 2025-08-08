import { cleanName, defaultSubScope, naming, rsInfo } from '../Common';
import env from '../env';
import { getSecrets } from '../KeyVault/Helper';
import {
  KeyVaultInfo,
  NamingType,
  ResourceWithVaultArgs,
  StorageConnectionInfo,
  StorageInfo,
} from '../types';
import { interpolate } from '@pulumi/pulumi';

const getStorageSecrets = ({
  storageName,
  vaultInfo,
}: {
  storageName: string;
  vaultInfo: KeyVaultInfo;
}): StorageConnectionInfo => {
  const primaryKey = env.DPA_CONN_ENABLE_SECONDARY
    ? `${storageName}-key-primary`
    : `${storageName}-key`;
  const secondaryKey = `${storageName}-key-secondary`;
  const primaryConnection = env.DPA_CONN_ENABLE_SECONDARY
    ? `${storageName}-conn-primary`
    : `${storageName}-conn`;
  const secondaryConnection = `${storageName}-conn-secondary`;

  return getSecrets({
    vaultInfo,
    names: env.DPA_CONN_ENABLE_SECONDARY
      ? { primaryKey, secondaryKey, primaryConnection, secondaryConnection }
      : { primaryKey, primaryConnection },
  });
};

export const getStorageEndpoints = (name: string) => ({
  blob: `https://${name}.blob.core.windows.net`,
  file: `https://${name}.file.core.windows.net`,
  table: `https://${name}.table.core.windows.net`,
});

export const getStorageInfo = ({
  name,
  group,
  vaultInfo,
}: ResourceWithVaultArgs): StorageInfo => {
  name = naming.getStorageName(cleanName(name));
  const secrets = vaultInfo
    ? getStorageSecrets({ storageName: name, vaultInfo })
    : {};

  return {
    name,
    group,
    endpoints: getStorageEndpoints(name),
    ...secrets,
    id: interpolate`${defaultSubScope}/resourceGroups/${group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${name}`,
  };
};

export const getStorageInfoByName = (
  name: string,
  groupName: NamingType,
  vaultInfo: KeyVaultInfo | undefined = undefined
) =>
  getStorageInfo({
    name,
    group: rsInfo.getRGInfo(groupName),
    vaultInfo,
  });
