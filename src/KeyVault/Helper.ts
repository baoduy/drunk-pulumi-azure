import * as keyvault from "@pulumi/azure-native/keyvault";
import { Input, output, Resource } from "@pulumi/pulumi";
import { KeyVaultInfo } from "../types";
import { getSecretName } from "../Common/Naming";
import { replaceAll } from "../Common/Helpers";
import { getKeyVaultBase } from "@drunk-pulumi/azure-providers/AzBase/KeyVaultBase";
import * as VaultRole from "../AzAd/KeyVaultRoles";
//known issue: https://github.com/pulumi/pulumi-azure-native/issues/1013

type SecretProps = {
  name: string;

  value: Input<string>;
  vaultInfo: KeyVaultInfo;

  contentType?: Input<string>;

  tags?: Input<{
    [key: string]: Input<string>;
  }>;
  dependsOn?: Input<Resource> | Input<Input<Resource>[]>;
};

type GetVaultItemProps = {
  name: string;
  version?: string;
  vaultInfo: KeyVaultInfo;
  nameFormatted?: boolean;
};

export const addKey = ({
  name,
  vaultInfo,
  tags,
  dependsOn,
}: Omit<SecretProps, "value" | "contentType">) => {
  const n = getSecretName(name);

  return new keyvault.Key(
    replaceAll(name, ".", "-"),
    {
      keyName: n,
      vaultName: vaultInfo.name,
      ...vaultInfo.group,
      //https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.keyvault.webkey?view=azure-dotnet-legacy
      properties: {
        keySize: 2048,
        kty: "RSA",
        keyOps: [
          "decrypt",
          "encrypt",
          "sign",
          "verify",
          "wrapKey",
          "unwrapKey",
        ],
        //curveName: 'P512',
        attributes: { enabled: true },
      },
      tags,
    },
    { dependsOn }
  );
};

/** Get Key */
export const getKey = async ({
  name,
  version,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps) => {
  const n = nameFormatted ? name : getSecretName(name);
  const client = getKeyVaultBase(vaultInfo.name);
  return client.getKey(n, version);
};

export const getEncryptionKey = (name: string, vaultInfo: KeyVaultInfo) => {
  const n = `${name}-encrypt-key`;
  return output(getKeyVaultBase(vaultInfo.name).getOrCreateKey(n));
};

/** Get Secret */
export const getSecret = async ({
  name,
  version,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps) => {
  const n = nameFormatted ? name : getSecretName(name);
  const client = getKeyVaultBase(vaultInfo.name);
  return client.getSecret(n, version);
};

interface KeyResult {
  name: string;
  /** The version may be empty if it is not found in the url */
  version: string;
  keyIdentityUrl: string;
  vaultUrl: string;
}

/** Convert VaultId to VaultInfo */
export const parseKeyUrl = (keyUrl: string): KeyResult => {
  const splits = keyUrl.split("/");
  return {
    keyIdentityUrl: keyUrl,
    name: splits[4],
    version: splits.length > 4 ? splits[5] : "",
    vaultUrl: `https://${splits[2]}`,
  };
};

export const getVaultRoleNames = async (nameOrInfo: string | KeyVaultInfo) => {
  if (typeof nameOrInfo === "string") {
    return VaultRole.getVaultRoleNames(nameOrInfo);
  }
  const value = await getSecret({
    name: "VaultRoleNames",
    vaultInfo: nameOrInfo,
  });
  return value
    ? (JSON.parse(value.value!) as { readOnly: string; admin: string })
    : undefined;
};
