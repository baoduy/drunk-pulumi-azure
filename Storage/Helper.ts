import * as storage from '@pulumi/azure-native/storage';
import dayjs from 'dayjs';

import { getConnectionName, getKeyName, getSecretName } from '../Common/Naming';
import { getSecret } from '../KeyVault/Helper';
import { BasicResourceArgs, KeyVaultInfo } from '../types';
import { ResourceGroupInfo } from './../types.d';


export const getStorageSecrets = async (
  { name, group, vaultInfo }: { name: string, group: ResourceGroupInfo, vaultInfo: KeyVaultInfo }
) => {
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
      })
    );

  return {

    primaryConnection: primaryConnection?.value,
    secondaryConnection: secondaryConnection?.value,
    primaryKey: primaryKey?.value,
    secondaryKey: secondaryKey?.value,

    endpoints: {
      blob: `https://${name}.blob.core.windows.net`,
      file: `https://${name}.file.core.windows.net`,
      table: `https://${name}.table.core.windows.net`,
      staticSite: `https://${name}.z23.web.core.windows.net`,
      DataLake: `https://${name}.dfs.core.windows.net`,
    },
  };
};

export const getAccountSAS = ({ group, name }: BasicResourceArgs) =>
  storage.listStorageAccountSAS({
    accountName: name,
    ...group,
    resourceTypes: storage.SignedResourceTypes.C,
    services: storage.Services.B,
    permissions: storage.Permissions.W,
    protocols: storage.HttpProtocol.Https,
    sharedAccessStartTime: dayjs().toISOString(),
    sharedAccessExpiryTime: dayjs().add(3, 'year').toISOString(),
  });
