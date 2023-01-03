import * as storage from "@pulumi/azure-native/storage";
import dayjs from "dayjs";

import { getConnectionName, getKeyName, getSecretName } from "../Common/Naming";
import { getSecret } from "../KeyVault/Helper";
import { BasicResourceArgs, KeyVaultInfo } from "../types";
import { getResourceInfoFromId } from "../Common/AzureEnv";

export const getStorageSecrets = async ({
  fullName,
  //group,
  vaultInfo,
}: {
  fullName: string;
  //group: ResourceGroupInfo,
  vaultInfo: KeyVaultInfo;
}) => {
  const primaryKeyName = getKeyName(fullName, "primary");
  const secondaryKeyName = getKeyName(fullName, "secondary");
  const primaryConnectionKeyName = getConnectionName(fullName, "primary");
  const secondConnectionKeyName = getConnectionName(fullName, "secondary");

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
      blob: `https://${fullName}.blob.core.windows.net`,
      file: `https://${fullName}.file.core.windows.net`,
      table: `https://${fullName}.table.core.windows.net`,
      staticSite: `https://${fullName}.z23.web.core.windows.net`,
      DataLake: `https://${fullName}.dfs.core.windows.net`,
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
  const info = getResourceInfoFromId(storageId);
  const secrets = info
    ? await getStorageSecrets({ fullName: info.name, vaultInfo })
    : undefined;

  return secrets ? { info, secrets } : undefined;
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
    sharedAccessExpiryTime: dayjs().add(3, "year").toISOString(),
  });
