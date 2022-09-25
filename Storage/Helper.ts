import { BasicResourceArgs, KeyVaultInfo } from '../types';
import { getResourceInfoFromId } from '../Common/ResourceEnv';
import * as storage from '@pulumi/azure-native/storage';
import { getSecret } from '../KeyVault/Helper';
import * as dayjs from 'dayjs';
import { getConnectionName, getKeyName, getSecretName } from '../Common/Naming';
import { globalKeyName } from '../Common/config';

interface Props {
  id: string;
  vaultInfo: KeyVaultInfo;
  globalResource?: boolean;
}

export const getStorageSecrets = async ({
  id,
  vaultInfo,
  globalResource,
}: Props) => {
  const info = getResourceInfoFromId(id);
  if (!info) return undefined;

  const primaryKeyName = getKeyName(info.name, 'primary');
  const secondaryKeyName = getKeyName(info.name, 'secondary');
  const primaryConnectionKeyName = getConnectionName(info.name, 'primary');
  const secondConnectionKeyName = getConnectionName(info.name, 'secondary');

  const [primaryConnection, secondaryConnection, primaryKey, secondaryKey] =
    await Promise.all(
      [
        primaryConnectionKeyName,
        secondConnectionKeyName,
        primaryKeyName,
        secondaryKeyName,
      ].map((k) => {
        const n = globalResource
          ? k.replace(globalKeyName, '')
          : getSecretName(k);
        return getSecret({ name: n, vaultInfo, nameFormatted: true });
      })
    );

  return {
    info,
    primaryConnection: primaryConnection?.value,
    secondaryConnection: secondaryConnection?.value,
    primaryKey: primaryKey?.value,
    secondaryKey: secondaryKey?.value,

    endpoints: {
      blob: `https://${info.name}.blob.core.windows.net`,
      file: `https://${info.name}.file.core.windows.net`,
      table: `https://${info.name}.table.core.windows.net`,
      staticSite: `https://${info.name}.z23.web.core.windows.net`,
      DataLake: `https://${info.name}.dfs.core.windows.net`,
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
