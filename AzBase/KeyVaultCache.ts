import { KeyVaultInfo } from '../types';
import { KeyVaultSecret } from '@azure/keyvault-secrets';
import { KeyVaultKey } from '@azure/keyvault-keys';

class KeyVaultCache {
  _secretsCache: Record<string, KeyVaultSecret | undefined> = {};
  _keyCache: Record<string, KeyVaultKey | undefined> = {};

  constructor(private readonly keyVaultName: string) {}

  private getName(name: string) {
    return `${this.keyVaultName}-${name}`;
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

export function getKeyVaultCache(keyVaultName: string) {
  let cache = _keyVaultCache[keyVaultName];
  if (cache) return cache;

  cache = new KeyVaultCache(keyVaultName);
  _keyVaultCache[keyVaultName] = cache;
  return cache;
}
