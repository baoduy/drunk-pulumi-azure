import { Input, output, Resource } from '@pulumi/pulumi';
import { replaceAll } from '../Common';
import { VaultSecretResource } from '@drunk-pulumi/azure-providers/VaultSecret';
import { KeyVaultInfo, NamedBasicArgs, NamedWithVaultType } from '../types';
import { getSecret } from '../Common/ConfigHelper';
import { getVaultItemName } from './Helper';
import env from '../env';

interface Props extends Required<NamedWithVaultType> {
  /** The value of the secret. If Value is not provided the secret will be got from config*/
  value?: Input<string>;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

/**Add key vault secret from a value or from pulumi configuration secret. */
export const addVaultSecretFrom = ({
  name,
  value,
  vaultInfo,
  dependsOn,
}: Props) => {
  if (!value) value = getSecret(name);
  if (!value) throw new Error(`The value of "${name}" is not defined.`);

  return addCustomSecret({
    name,
    value,
    vaultInfo,
    contentType: 'config variables',
    dependsOn,
  });
};

interface SecretProps extends NamedBasicArgs {
  value: Input<string>;
  vaultInfo: KeyVaultInfo;
  contentType?: Input<string>;
  tags?: Input<{
    [key: string]: string;
  }>;
}

/** Add a secret to Key Vault. This will auto recover the deleted item and update with a new value if existed. */
export const addCustomSecret = ({
  name,
  vaultInfo,
  value,
  contentType,
  dependsOn,
  ...others
}: SecretProps) => {
  const n = env.DPA_VAULT_DISABLE_FORMAT_NAME ? name : getVaultItemName(name);
  //This KeyVault Secret is not auto recovery the deleted one.
  return new VaultSecretResource(
    replaceAll(name, '.', '-'),
    {
      name: n,
      value: value ? output(value).apply((v) => v || '') : '',
      vaultName: vaultInfo.name,
      contentType: contentType || name,
      ...others,
    },
    { dependsOn },
  );
};

interface MultiSecretProps extends Omit<SecretProps, 'value' | 'name'> {
  items: Array<{ name: string; value: Input<string> }>;
}

/** Add multi secrets to Key Vault. This will auto recover the deleted item and update with a new value if existed. */
export const addCustomSecrets = ({ items, ...others }: MultiSecretProps) =>
  items.map((i) => addCustomSecret({ ...i, ...others }));
