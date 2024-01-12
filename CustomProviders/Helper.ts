import { SecretClient } from '@azure/keyvault-secrets';
import { ClientCredential } from './Base';

export const createKeyVaultClient = (vaultName: string) => {
  const url = `https://${vaultName}.vault.azure.net?api-version=7.0`;
  const client = new SecretClient(url, new ClientCredential());
  return client;
};
