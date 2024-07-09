import * as storage from '@pulumi/azure-native/storage';

import {
  getConnectionName,
  getKeyName,
  getSecretName,
  getStorageName,
} from '../Common';
import { getSecret } from '../KeyVault/Helper';
import { BasicResourceArgs, KeyVaultInfo } from '../types';
import { parseResourceInfoFromId } from '../Common/AzureEnv';

export type StorageConnectionInfo = {
  primaryConnection: string;
  secondaryConnection: string;
  primaryKey: string;
  secondaryKey: string;

  endpoints: {
    blob: string;
    file: string;
    table: string;
    staticSite: string;
    DataLake: string;
  };
};

export const getStorageSecrets = async ({
  name,
  nameFormatted,
  vaultInfo,
}: {
  name: string;
  nameFormatted?: boolean;
  vaultInfo: KeyVaultInfo;
}): Promise<StorageConnectionInfo> => {
  name = nameFormatted ? name : getStorageName(name);
  const primaryKeyName = getKeyName(name, 'primary');
  const secondaryKeyName = getKeyName(name, 'secondary');
  const primaryConnectionKeyName = getConnectionName(name, 'primary');
  const secondConnectionKeyName = getConnectionName(name, 'secondary');

  const [primaryConnection, secondaryConnection, primaryKey, secondaryKey] =
    await Promise.all(
      [
        primaryConnectionKeyName,
        secondConnectionKeyName,
        primaryKeyName,
        secondaryKeyName,
      ].map((k) => {
        const n = getSecretName(k);
        return getSecret({ name: n, vaultInfo, nameFormatted: true });
      }),
    );

  return {
    primaryConnection: primaryConnection?.value!,
    secondaryConnection: secondaryConnection?.value!,
    primaryKey: primaryKey?.value!,
    secondaryKey: secondaryKey?.value!,

    endpoints: {
      blob: `https://${name}.blob.core.windows.net`,
      file: `https://${name}.file.core.windows.net`,
      table: `https://${name}.table.core.windows.net`,
      staticSite: `https://${name}.z23.web.core.windows.net`,
      DataLake: `https://${name}.dfs.core.windows.net`,
    },
  };
};

export const getStorageSecretsById = async ({
  storageId,
  vaultInfo,
}: {
  storageId: string;
  vaultInfo: KeyVaultInfo;
}) => {
  const info = parseResourceInfoFromId(storageId);
  const secrets = info
    ? await getStorageSecrets({
        name: info.name,
        nameFormatted: true,
        vaultInfo,
      })
    : undefined;

  return secrets ? { info, secrets } : undefined;
};

export const getAccountSAS = ({ group, name }: BasicResourceArgs) => {
  const now = new Date();
  const expireDate = new Date();
  expireDate.setMonth(expireDate.getMonth() + 3);

  return storage.listStorageAccountSAS({
    accountName: name,
    ...group,
    resourceTypes: storage.SignedResourceTypes.C,
    services: storage.Services.B,
    permissions: storage.Permissions.W,
    protocols: storage.HttpProtocol.Https,
    sharedAccessStartTime: now.toISOString(),
    sharedAccessExpiryTime: expireDate.toISOString(),
  });
};
