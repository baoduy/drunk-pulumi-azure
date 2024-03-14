import { KeyVaultInfo } from '../types';
import { KeyVaultSecret } from '@azure/keyvault-secrets';
import { KeyVaultKey } from '@azure/keyvault-keys';

class KeyVaultCache {
  _secretsCache: Record<string, KeyVaultSecret | undefined> = {};
  _keyCache: Record<string, KeyVaultKey | undefined> = {};

  constructor(private readonly vaultInfo: KeyVaultInfo) {}

  private getName(name: string) {
    return `${this.vaultInfo.name}-${name}`;
  }

  public setSecret(secret: KeyVaultSecret) {
    this._secretsCache[this.getName(secret.name)] = secret;
  }
  public getSecret(name: string) {
    return this._secretsCache[this.getName(name)];
  }

  public setKey(key: KeyVaultKey) {
    this._keyCache[this.getName(key.name)] = key;
  }
  public getKey(name: string) {
    return this._keyCache[this.getName(name)];
  }
}

const _keyVaultCache: Record<string, KeyVaultCache> = {};

export const getKeyVaultCache = (vaultInfo: KeyVaultInfo) => {
  let cache = _keyVaultCache[vaultInfo.name];
  if (cache) return cache;

  cache = new KeyVaultCache(vaultInfo);
  _keyVaultCache[vaultInfo.name] = cache;
  return cache;
};
