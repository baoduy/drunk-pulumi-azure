import { KeyVaultInfo } from '../types';
import { SecretClient, SecretProperties } from '@azure/keyvault-secrets';
import {
  DefaultAzureCredential,
  TokenCredentialOptions,
} from '@azure/identity';
import { KeyClient } from '@azure/keyvault-keys';
import { getKeyVaultCache } from './KeyVaultCache';
import { TokenCredential } from '@azure/core-auth';
import { isDryRun } from '../Common/StackEnv';

/** The Key vault management */
class KeyVaultBase {
  private readonly _secretClient: SecretClient;
  private readonly _keyClient: KeyClient;

  constructor(
    private readonly keyVaultName: string,
    credential: TokenCredential | undefined = undefined
  ) {
    const url = `https://${keyVaultName}.vault.azure.net?api-version=7.0`;
    credential = credential ?? new DefaultAzureCredential();

    this._secretClient = new SecretClient(url, credential);
    this._keyClient = new KeyClient(url, credential);
  }

  private get Cache() {
    return getKeyVaultCache(this.keyVaultName);
  }

  /** Get Secret Versions*/
  public async getSecretVersions(
    name: string,
    version: string | undefined = undefined
  ) {
    const rs = this._secretClient
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
  public async getKeyVersions(
    name: string,
    version: string | undefined = undefined
  ) {
    const rs = this._keyClient
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
  public async checkSecretExist(
    name: string,
    version: string | undefined = undefined
  ) {
    const versions = await this.getSecretVersions(name, version);

    if (versions.length > 0) {
      console.log(`The secret '${name}' is existed.`);
      return true;
    }

    console.log(`The secret '${name}' is NOT existed.`);
    return false;
  }

  /** Check whether Key is existed or not*/
  public async checkKeyExist(
    name: string,
    version: string | undefined = undefined
  ) {
    const versions = await this.getKeyVersions(name, version);

    if (versions.length > 0) {
      console.log(`The key '${name}' is existed.`);
      return true;
    }

    console.log(`The key '${name}' is NOT existed.`);
    return false;
  }

  /**Get deleted Secret*/
  public async getDeletedSecret(name: string) {
    return await this._secretClient
      .getDeletedSecret(name)
      .catch(() => undefined);
  }

  /**Get deleted Key*/
  public async getDeletedKey(name: string) {
    return await this._keyClient.getDeletedKey(name).catch(() => undefined);
  }

  /**Recover the deleted Secret*/
  public async recoverDeletedSecret(name: string) {
    if (isDryRun) return undefined;

    const deleted = await this.getDeletedSecret(name);
    //Recover deleted items
    if (deleted) {
      await (
        await this._secretClient.beginRecoverDeletedSecret(deleted.name)
      ).pollUntilDone();
      return true;
    }
    return false;
  }

  /**Recover deleted Key*/
  public async recoverDeletedKey(name: string) {
    if (isDryRun) return undefined;

    const deleted = await this.getDeletedKey(name);
    //Recover deleted items
    if (deleted) {
      await (
        await this._keyClient.beginRecoverDeletedKey(deleted.name)
      ).pollUntilDone();
      return true;
    }
    return false;
  }

  /** Create or update the Secret. This will recover the deleted automatically.*/
  public async setSecret(
    name: string,
    value: string,
    contentType: string | undefined = undefined,
    tags: { [p: string]: string } | undefined = undefined
  ) {
    if (isDryRun) return undefined;

    await this.recoverDeletedSecret(name);
    return await this._secretClient.setSecret(name, value, {
      enabled: true,
      contentType,
      tags,
    });
  }

  /** Get Rsa Key*/
  public async createRsaKey(
    name: string,
    tags: { [p: string]: string } | undefined = undefined
  ) {
    if (isDryRun) return undefined;

    await this.recoverDeletedKey(name);
    const expiresOn = new Date(
      new Date().setFullYear(new Date().getFullYear() + 3)
    );

    return await this._keyClient.createRsaKey(name, {
      enabled: true,
      tags,
      keySize: 2048,
      keyOps: ['decrypt', 'encrypt', 'sign', 'verify', 'wrapKey', 'unwrapKey'],
      expiresOn,
    });
  }

  /** Get Secret*/
  public async getSecret(
    name: string,
    version: string | undefined = undefined
  ) {
    let result = this.Cache.getSecret(name);
    if (result) return result;

    result = await this._secretClient
      .getSecret(name, { version })
      .catch((err) => {
        console.error(`${this.keyVaultName}: ${err.message || err}`);
        return undefined;
      });

    if (result) this.Cache.setSecret(result);
    return result;
  }

  /** Get Key*/
  public async getKey(name: string, version: string | undefined = undefined) {
    let result = this.Cache.getKey(name);
    if (result) return result;

    result = await this._keyClient.getKey(name, { version }).catch((err) => {
      console.error(`${this.keyVaultName}: ${err.message || err}`);
      return undefined;
    });

    if (result) this.Cache.setKey(result);
    return result;
  }

  /** Get or create Key */
  public async getOrCreateKey(name: string, type: 'Rsa' = 'Rsa') {
    if (await this.checkKeyExist(name)) return await this.getKey(name);
    return await this.createRsaKey(name);
  }

  /** Delete Secret */
  public async deleteSecret(name: string) {
    if (isDryRun) return undefined;
    await this._secretClient.beginDeleteSecret(name).catch();
  }

  /** Delete Key */
  public async deleteKey(name: string) {
    if (isDryRun) return undefined;
    await this._keyClient.beginDeleteKey(name).catch();
  }
}

export const _keyVaultBaseCache: Record<string, KeyVaultBase> = {};

export function getKeyVaultBase(vaultInfo: KeyVaultInfo | string) {
  const n = typeof vaultInfo === 'string' ? vaultInfo : vaultInfo.name;
  let cache = _keyVaultBaseCache[n];
  if (cache) return cache;

  cache = new KeyVaultBase(n);
  _keyVaultBaseCache[n] = cache;
  return cache;
}
