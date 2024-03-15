import { SecretClient, SecretProperties } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { KeyClient } from '@azure/keyvault-keys';
import { getKeyVaultCache, KeyVaultCacheType } from './KeyVaultCache';
import { isDryRun } from '../Common/StackEnv';

type ClientType = {
  keyVaultName: string;
  secretClient: SecretClient;
  keyClient: KeyClient;
};

/** Get Secret and Hey Clients */
function getClients(keyVaultName: string): ClientType {
  const url = `https://${keyVaultName}.vault.azure.net?api-version=7.0`;
  const credential = new DefaultAzureCredential();

  const secretClient = new SecretClient(url, credential);
  const keyClient = new KeyClient(url, credential);

  return { keyVaultName, secretClient, keyClient };
}

/** Get Secret Versions*/
async function getSecretVersions(
  name: string,
  version: string | undefined = undefined,
  client: ClientType
) {
  const rs = client.secretClient
    .listPropertiesOfSecretVersions(name)
    .byPage({ maxPageSize: 10 });

  const versionsList = new Array<SecretProperties>();
  for await (const s of rs) {
    s.forEach((p) => versionsList.push(p));
  }

  //Filter for specific version only
  if (version) return versionsList.filter((s) => s.version === version);
  return versionsList;
}

/** Get Key Versions*/
async function getKeyVersions(
  name: string,
  version: string | undefined = undefined,
  client: ClientType
) {
  const rs = client.keyClient
    .listPropertiesOfKeyVersions(name)
    .byPage({ maxPageSize: 10 });

  const versionsList = new Array<SecretProperties>();
  for await (const s of rs) {
    s.forEach((p) => versionsList.push(p));
  }

  //Filter for specific version only
  if (version) return versionsList.filter((s) => s.version === version);
  return versionsList;
}

/** Check whether Secret is existed or not*/
async function checkSecretExist(
  name: string,
  version: string | undefined = undefined,
  client: ClientType
) {
  const versions = await getSecretVersions(name, version, client);

  if (versions.length > 0) {
    console.log(`The secret '${name}' is existed.`);
    return true;
  }

  console.log(`The secret '${name}' is NOT existed.`);
  return false;
}

/** Check whether Key is existed or not*/
async function checkKeyExist(
  name: string,
  version: string | undefined = undefined,
  client: ClientType
) {
  const versions = await getKeyVersions(name, version, client);

  if (versions.length > 0) {
    console.log(`The key '${name}' is existed.`);
    return true;
  }

  console.log(`The key '${name}' is NOT existed.`);
  return false;
}

/**Get deleted Secret*/
async function getDeletedSecret(name: string, client: ClientType) {
  return await client.secretClient
    .getDeletedSecret(name)
    .catch(() => undefined);
}

/**Get deleted Key*/
async function getDeletedKey(name: string, client: ClientType) {
  return await client.keyClient.getDeletedKey(name).catch(() => undefined);
}

/**Recover the deleted Secret*/
async function recoverDeletedSecret(name: string, client: ClientType) {
  if (isDryRun) return undefined;

  const deleted = await getDeletedSecret(name, client);
  //Recover deleted items
  if (deleted) {
    await (
      await client.secretClient.beginRecoverDeletedSecret(deleted.name)
    ).pollUntilDone();
    return true;
  }
  return false;
}

/**Recover deleted Key*/
async function recoverDeletedKey(name: string, client: ClientType) {
  if (isDryRun) return undefined;

  const deleted = await getDeletedKey(name, client);
  //Recover deleted items
  if (deleted) {
    await (
      await client.keyClient.beginRecoverDeletedKey(deleted.name)
    ).pollUntilDone();
    return true;
  }
  return false;
}

/** Create or update the Secret. This will recover the deleted automatically.*/
async function setSecret(
  name: string,
  value: string,
  contentType: string | undefined = undefined,
  tags: { [p: string]: string } | undefined = undefined,
  client: ClientType
) {
  if (isDryRun) return undefined;

  await recoverDeletedSecret(name, client);
  return await client.secretClient.setSecret(name, value, {
    enabled: true,
    contentType,
    tags,
  });
}

/** Get Rsa Key*/
async function createRsaKey(
  name: string,
  tags: { [p: string]: string } | undefined = undefined,
  client: ClientType
) {
  if (isDryRun) return undefined;

  await recoverDeletedKey(name, client);
  const expiresOn = new Date(
    new Date().setFullYear(new Date().getFullYear() + 3)
  );

  return await client.keyClient.createRsaKey(name, {
    enabled: true,
    tags,
    keySize: 2048,
    keyOps: ['decrypt', 'encrypt', 'sign', 'verify', 'wrapKey', 'unwrapKey'],
    expiresOn,
  });
}

/** Get Secret*/
async function getSecret(
  name: string,
  version: string | undefined = undefined,
  client: ClientType,
  cache: KeyVaultCacheType
) {
  let result = cache.getSecret(name);
  if (result) return result;

  result = await client.secretClient
    .getSecret(name, { version })
    .catch((err) => {
      console.error(`${client.keyVaultName}: ${err.message || err}`);
      return undefined;
    });

  if (result) cache.setSecret(result);
  return result;
}

/** Get Key*/
async function getKey(
  name: string,
  version: string | undefined = undefined,
  client: ClientType,
  cache: KeyVaultCacheType
) {
  let result = cache.getKey(name);
  if (result) return result;

  result = await client.keyClient.getKey(name, { version }).catch((err) => {
    console.error(`${client.keyVaultName}: ${err.message || err}`);
    return undefined;
  });

  if (result) cache.setKey(result);
  return result;
}

/** Get or create Key */
async function getOrCreateKey(
  name: string,
  type: 'Rsa' = 'Rsa',
  client: ClientType,
  cache: KeyVaultCacheType
) {
  if (await checkKeyExist(name, undefined, client))
    return await getKey(name, undefined, client, cache);
  return await createRsaKey(name, undefined, client);
}

/** Delete Secret */
async function deleteSecret(name: string, client: ClientType) {
  if (isDryRun) return undefined;
  await client.secretClient.beginDeleteSecret(name).catch();
}

/** Delete Key */
async function deleteKey(name: string, client: ClientType) {
  if (isDryRun) return undefined;
  await client.keyClient.beginDeleteKey(name).catch();
}

/** the KeyVaultBase swapper*/
export function getKeyVaultBase(keyVaultName: string) {
  const clients = getClients(keyVaultName);
  const cache = getKeyVaultCache(keyVaultName);
  return {
    checkSecretExist: (name: string, version: string | undefined = undefined) =>
      checkSecretExist(name, version, clients),
    checkKeyExist: (name: string, version: string | undefined = undefined) =>
      checkKeyExist(name, version, clients),
    getSecret: (name: string, version: string | undefined = undefined) =>
      getSecret(name, version, clients, cache),
    getKey: (name: string, version: string | undefined = undefined) =>
      getKey(name, version, clients, cache),
    setSecret: (
      name: string,
      value: string,
      contentType: string | undefined = undefined,
      tags: { [p: string]: string } | undefined = undefined
    ) => setSecret(name, value, contentType, tags, clients),
    getOrCreateKey: (name: string, type: 'Rsa' = 'Rsa') =>
      getOrCreateKey(name, type, clients, cache),
    deleteSecret: (name: string) => deleteSecret(name, clients),
    deleteKey: (name: string) => deleteKey(name, clients),
  };
}
