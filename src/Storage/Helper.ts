import { cleanName, defaultSubScope, naming } from '../Common';
import { getSecrets } from '../KeyVault/Helper';
import {
  KeyVaultInfo,
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
  const primaryKey = `${storageName}-key-primary`;
  const secondaryKey = `${storageName}-key-secondary`;
  const primaryConnection = `${storageName}-conn-primary`;
  const secondaryConnection = `${storageName}-conn-secondary`;

  return getSecrets({
    vaultInfo,
    names: { primaryKey, secondaryKey, primaryConnection, secondaryConnection },
  });
};

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
    endpoints: {
      blob: `https://${name}.blob.core.windows.net`,
      file: `https://${name}.file.core.windows.net`,
      table: `https://${name}.table.core.windows.net`,
    },
    ...secrets,
    id: interpolate`${defaultSubScope}/resourceGroups/${group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${name}`,
  };
};

// export const getStorageSecretsById = async ({
//   storageId,
//   vaultInfo,
// }: {
//   storageId: string;
//   vaultInfo: KeyVaultInfo;
// }) => {
//   const info = rsInfo.getResourceInfoFromId(storageId);
//   const secrets = info
//     ? await getStorageSecrets({
//         name: info.name,
//         nameFormatted: true,
//         vaultInfo,
//       })
//     : undefined;
//
//   return secrets ? { info, secrets } : undefined;
// };

// export const getAccountSAS = ({ group, name }: BasicResourceArgs) => {
//   const now = new Date();
//   const expireDate = new Date();
//   expireDate.setMonth(expireDate.getMonth() + 3);
//
//   return storage.listStorageAccountSAS({
//     accountName: name,
//     ...group,
//     resourceTypes: storage.SignedResourceTypes.C,
//     services: storage.Services.B,
//     permissions: storage.Permissions.W,
//     protocols: storage.HttpProtocol.Https,
//     sharedAccessStartTime: now.toISOString(),
//     sharedAccessExpiryTime: expireDate.toISOString(),
//   });
// };
