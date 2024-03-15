import { KeyVaultSecret } from '@azure/keyvault-secrets';
import { KeyVaultKey } from '@azure/keyvault-keys';

export type KeyVaultCacheType = {
  setSecret: (secret: KeyVaultSecret) => void;
  getSecret: (name: string) => KeyVaultSecret | undefined;
  setKey: (key: KeyVaultKey) => void;
  getKey: (name: string) => KeyVaultKey | undefined;
};

export function getKeyVaultCache(keyVaultName: string): KeyVaultCacheType {
  const secretsCache: Record<string, KeyVaultSecret | undefined> = {};
  const keyCache: Record<string, KeyVaultKey | undefined> = {};
  const getName = (name: string) => `${keyVaultName}-${name}`;

  return {
    setSecret: (secret: KeyVaultSecret) =>
      (secretsCache[getName(secret.name)] = secret),
    getSecret: (name: string) => secretsCache[getName(name)],
    setKey: (key: KeyVaultKey) => (keyCache[getName(key.name)] = key),
    getKey: (name: string) => keyCache[getName(name)],
  };
}
