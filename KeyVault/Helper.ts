import * as keyvault from '@pulumi/azure-native/keyvault';
import { Input, Resource } from '@pulumi/pulumi';
import { ClientCredential } from '../CustomProviders/Base';
import { KeyClient, KeyVaultKey } from '@azure/keyvault-keys';
import { KeyVaultInfo } from '../types';
import { KeyVaultSecret, SecretClient } from '@azure/keyvault-secrets';
import { getSecretName } from '../Common/Naming';
import { replaceAll } from '../Common/Helpers';
import * as console from 'console';
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

/** Check Secret */
export const checkSecretExist = async ({
  name,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps) => {
  const n = nameFormatted ? name : getSecretName(name);

  const url = `https://${vaultInfo.name}.vault.azure.net?api-version=7.0`;
  const client = new SecretClient(url, new ClientCredential());
  const rs = client
    .listPropertiesOfSecretVersions(n)
    .byPage({ maxPageSize: 1 });

  for await (const s of rs) {
    if (s.length > 0) {
      console.log(`The secret '${name}' is existed.`);
      return true;
    } else break;
  }
  console.log(`The secret '${name}' is NOT existed.`);
  return false;
};

/** Check Secret */
export const checkKeyExist = async ({
  name,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps) => {
  const n = nameFormatted ? name : getSecretName(name);

  const url = `https://${vaultInfo.name}.vault.azure.net?api-version=7.0`;
  const client = new KeyClient(url, new ClientCredential());
  const rs = client.listPropertiesOfKeyVersions(n).byPage({ maxPageSize: 1 });

  for await (const s of rs) {
    if (s.length > 0) {
      console.log(`The key '${name}' is existed.`);
      return true;
    } else break;
  }

  console.log(`The key '${name}' is NOT existed.`);
  return false;
};
// export const addSecret = ({
//   name,
//   vaultInfo,
//   value,
//   contentType,
//   tags,
//   dependsOn,
// }: SecretProps) => {
//   const n = getSecretName(name);
//
//   return new keyvault.Secret(
//     replaceAll(name, '.', '-'),
//     {
//       secretName: n,
//       vaultName: vaultInfo.name,
//       ...vaultInfo.group,
//       properties: {
//         value: value ? output(value).apply((v) => v || '') : '',
//         contentType: contentType || name,
//         attributes: { enabled: true },
//       },
//       tags,
//     },
//     { dependsOn }
//   );
// };

export const addKey = ({
  name,
  vaultInfo,
  tags,
  dependsOn,
}: Omit<SecretProps, 'value' | 'contentType'>) => {
  const n = getSecretName(name);

  return new keyvault.Key(
    replaceAll(name, '.', '-'),
    {
      keyName: n,
      vaultName: vaultInfo.name,
      ...vaultInfo.group,
      //https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.keyvault.webkey?view=azure-dotnet-legacy
      properties: {
        keySize: 2048,
        kty: 'RSA',
        keyOps: [
          'decrypt',
          'encrypt',
          'sign',
          'verify',
          'wrapKey',
          'unwrapKey',
        ],
        //curveName: 'P512',
        attributes: { enabled: true },
      },
      tags,
    },
    { dependsOn }
  );
};

type GetVaultItemProps = {
  name: string;
  vaultInfo: KeyVaultInfo;
  nameFormatted?: boolean;
};
const _keysCache: Record<string, KeyVaultKey | undefined> = {};
/** Get Key */
export const getKey = async ({
  name,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps): Promise<KeyVaultKey | undefined> => {
  const n = nameFormatted ? name : getSecretName(name);
  const cacheKey = `${vaultInfo.name}-${n}`;
  //Try get key from cache
  if (_keysCache[cacheKey]) return _keysCache[cacheKey];

  const url = `https://${vaultInfo.name}.vault.azure.net?api-version=7.0`;
  const client = new KeyClient(url, new ClientCredential());

  const rs = await client.getKey(n).catch((err) => {
    console.error(`${vaultInfo.name}: ${err.message || err}`);
    return undefined;
  });

  //Put value to cache
  _secretsCache[cacheKey] = rs;
  return rs;
};

const _secretsCache: Record<string, KeyVaultSecret | undefined> = {};
/** Get Secret */
export const getSecret = async ({
  name,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps): Promise<KeyVaultSecret | undefined> => {
  const n = nameFormatted ? name : getSecretName(name);
  const cacheKey = `${vaultInfo.name}-${n}`;
  //Try get key from cache
  if (_secretsCache[cacheKey]) return _secretsCache[cacheKey];

  const url = `https://${vaultInfo.name}.vault.azure.net?api-version=7.0`;
  const client = new SecretClient(url, new ClientCredential());

  const rs = await client.getSecret(n).catch((err) => {
    console.error(`${vaultInfo.name}: ${err.message || err}`);
    return undefined;
  });

  //Put value to cache
  _secretsCache[cacheKey] = rs;
  return rs;
};

export const parseVaultInfo = (vaultId: string): KeyVaultInfo => {
  const splits = vaultId.split('/');
  return {
    name: splits[8],
    group: { resourceGroupName: splits[4] },
    id: vaultId,
  };
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
  const splits = keyUrl.split('/');
  return {
    keyIdentityUrl: keyUrl,
    name: splits[4],
    version: splits.length > 4 ? splits[5] : '',
    vaultUrl: `https://${splits[2]}`,
  };
};
