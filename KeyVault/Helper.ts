import * as keyvault from '@pulumi/azure-native/keyvault';
import { Input, Resource } from '@pulumi/pulumi';
import { ClientCredential } from '../CustomProviders/Base';
import { KeyClient, KeyProperties, KeyVaultKey } from '@azure/keyvault-keys';
import { KeyVaultInfo } from '../types';
import {
  KeyVaultSecret,
  SecretClient,
  SecretProperties,
} from '@azure/keyvault-secrets';
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

type GetVaultItemProps = {
  name: string;
  version?: string;
  vaultInfo: KeyVaultInfo;
  nameFormatted?: boolean;
};

const getSecretClient = (vaultInfo: KeyVaultInfo) => {
  const url = `https://${vaultInfo.name}.vault.azure.net?api-version=7.0`;
  return new SecretClient(url, new ClientCredential());
};

const getKeyClient = (vaultInfo: KeyVaultInfo) => {
  const url = `https://${vaultInfo.name}.vault.azure.net?api-version=7.0`;
  return new KeyClient(url, new ClientCredential());
};

/** Get Secret Version*/
export const getSecretVersions = async ({
  name,
  vaultInfo,
  nameFormatted,
}: Omit<GetVaultItemProps, 'version'>) => {
  const n = nameFormatted ? name : getSecretName(name);
  const client = getSecretClient(vaultInfo);

  const rs = client
    .listPropertiesOfSecretVersions(n)
    .byPage({ maxPageSize: 10 });

  const versions = new Array<SecretProperties>();
  for await (const s of rs) {
    s.forEach((p) => versions.push(p));
  }
  return versions;
};

/** Check Secret */
export const getKeyVersions = async ({
  name,
  vaultInfo,
  nameFormatted,
}: Omit<GetVaultItemProps, 'version'>) => {
  const n = nameFormatted ? name : getSecretName(name);
  const client = getKeyClient(vaultInfo);

  const rs = client.listPropertiesOfKeyVersions(n).byPage({ maxPageSize: 10 });

  const versions = new Array<KeyProperties>();
  for await (const s of rs) {
    s.forEach((p) => versions.push(p));
  }
  return versions;
};

/** Check Secret */
export const checkSecretExist = async (
  props: Omit<GetVaultItemProps, 'version'>
) => {
  const versions = await getSecretVersions(props);

  if (versions.length > 0) {
    console.log(`The secret '${props.name}' is existed.`);
    return true;
  } else;
  {
    console.log(`The secret '${props.name}' is NOT existed.`);
    return false;
  }
};

/** Check Secret */
export const checkKeyExist = async (
  props: Omit<GetVaultItemProps, 'version'>
) => {
  const versions = await getKeyVersions(props);

  if (versions.length > 0) {
    console.log(`The key '${props.name}' is existed.`);
    return true;
  } else;
  {
    console.log(`The key '${props.name}' is NOT existed.`);
    return false;
  }
};

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

const _keysCache: Record<string, KeyVaultKey | undefined> = {};
/** Get Key */
export const getKey = async ({
  name,
  version,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps): Promise<KeyVaultKey | undefined> => {
  const n = nameFormatted ? name : getSecretName(name);
  const cacheKey = `${vaultInfo.name}-${n}`;
  //Try get key from cache
  if (_keysCache[cacheKey]) return _keysCache[cacheKey];

  const client = getKeyClient(vaultInfo);

  const rs = await client.getKey(n, { version }).catch((err) => {
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
  version,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps): Promise<KeyVaultSecret | undefined> => {
  const n = nameFormatted ? name : getSecretName(name);
  const cacheKey = `${vaultInfo.name}-${n}`;
  //Try get key from cache
  if (_secretsCache[cacheKey]) return _secretsCache[cacheKey];

  const client = getSecretClient(vaultInfo);

  const rs = await client.getSecret(n, { version }).catch((err) => {
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
