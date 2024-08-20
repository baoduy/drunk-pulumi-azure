import { Output, output } from '@pulumi/pulumi';
import { KeyVaultInfo, NamedWithVaultType, WithVaultInfo } from '../types';
import getKeyVaultBase from '@drunk-pulumi/azure-providers/AzBase/KeyVaultBase';
import { VaultKeyResource } from '@drunk-pulumi/azure-providers';
import { stack, removeLeadingAndTrailingDash } from '../Common';
import * as env from '../envHelper';

/** Get Vault Secret Name. Remove the stack name and replace all _ with - then lower cases. */
const getVaultItemName = (name: string, currentStack: string = stack) => {
  name = name
    .replace(new RegExp(currentStack, 'g'), '') // Replace occurrences of "stack" variable with "-"
    .replace(/\.|_|\s/g, '-') // Replace ".", "_", and spaces with "-"
    .replace(/-+/g, '-') // Replace multiple dashes with a single dash
    .toLowerCase(); // Convert the result to lowercase

  return removeLeadingAndTrailingDash(name);
};

type GetVaultItemProps = Required<NamedWithVaultType> & {
  version?: string;
};

interface KeyVaultPropertiesResults {
  keyName: Output<string>;
  url: Output<string>;
  urlWithoutVersion: Output<string>;
  keyVaultUri: Output<string>;
  keyVersion: Output<string>;
}

export const addEncryptKey = (
  name: string,
  vaultInfo: KeyVaultInfo,
  keySize: 2048 | 3072 | 4096 = 4096,
): KeyVaultPropertiesResults => {
  const key = new VaultKeyResource(
    `${name}-encryptKey`,
    {
      name: `${name}-encryptKey`,
      vaultName: vaultInfo.name,
      key: { keySize },
    },
    { retainOnDelete: true },
  );

  const urlWithoutVersion: Output<string> = output([key.version, key.id]).apply(
    ([v, id]) => id.replace(`/${v}`, ''),
  );

  return {
    keyName: key.name,
    keyVaultUri: key.vaultUrl,
    keyVersion: key.version,
    url: key.id,
    urlWithoutVersion,
  };
};

/** Get Secret */
export const getSecret = async ({
  name,
  version,
  vaultInfo,
}: GetVaultItemProps) => {
  const n = env.DPA_VAULT_DISABLE_FORMAT_NAME ? name : getVaultItemName(name);
  const client = getKeyVaultBase(vaultInfo.name);
  return client.getSecret(n, version);
};

export const getSecretOutput = (props: GetVaultItemProps) =>
  output(getSecret(props));

interface GetSecretsType<T extends Record<string, string>>
  extends Required<WithVaultInfo> {
  names: T;
}

export const getSecrets = <T extends Record<string, string>>({
  names,
  ...others
}: GetSecretsType<T>): Record<keyof T, Output<string>> => {
  const rs: Record<string, Output<string>> = {};

  Object.keys(names).forEach((k) => {
    const name = names[k];
    const item = output(getSecret({ name, ...others }));
    rs[k] = item.apply((i) => i?.value ?? '');
  });

  return rs as Record<keyof T, Output<string>>;
};
