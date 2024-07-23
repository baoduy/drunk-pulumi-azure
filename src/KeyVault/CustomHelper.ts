import { CertArgs, VaultCertResource } from '@drunk-pulumi/azure-providers';
import { Input, output, Resource } from '@pulumi/pulumi';
import { getSecretName } from '../Common';
import { VaultSecretResource } from '@drunk-pulumi/azure-providers/VaultSecret';
import { BasicArgs, KeyVaultInfo, NamedResourceType } from '../types';
import { getSecret } from '../Common/ConfigHelper';
import { replaceAll } from '../Common/Helpers';

interface Props {
  name: string;
  /** The value of the secret. If Value is not provided the secret will be get from config*/
  value?: Input<string>;
  vaultInfo: KeyVaultInfo;
}

/**Add key vault secret from a value or from pulumi configuration secret. */
export const addVaultSecretFrom = ({ name, value, vaultInfo }: Props) => {
  if (!value) value = getSecret(name);
  if (!value) throw new Error(`The value of "${name}" is not defined.`);

  return addCustomSecret({
    name,
    value,
    vaultInfo,
    contentType: 'config variables',
  });
};

interface SecretProps {
  name: string;
  /**Use the name directly without applying naming format*/
  formattedName?: boolean;
  value: Input<string>;
  vaultInfo: KeyVaultInfo;
  contentType?: Input<string>;
  ignoreChange?: boolean;
  tags?: Input<{
    [key: string]: string;
  }>;
  dependsOn?: Input<Resource> | Input<Input<Resource>[]>;
}

/** Add a secret to Key Vault. This will auto recover the deleted item and update with a new value if existed. */
export const addCustomSecret = ({
  name,
  formattedName,
  vaultInfo,
  value,
  contentType,
  dependsOn,
  ...others
}: SecretProps) => {
  const n = formattedName ? name : getSecretName(name);
  //This KeyVault Secret is not auto recovery the deleted one.
  return new VaultSecretResource(
    replaceAll(name, '.', '-'),
    {
      name: replaceAll(n, '.', '-'),
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

