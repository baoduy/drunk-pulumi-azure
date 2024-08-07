import * as keyvault from '@pulumi/azure-native/keyvault';
import { Input, Output, output, Resource } from '@pulumi/pulumi';
import { NamedWithVaultType, WithVaultInfo } from '../types';
import { getSecretName, isDryRun, replaceAll } from '../Common';
import getKeyVaultBase from '@drunk-pulumi/azure-providers/AzBase/KeyVaultBase';
//known issue: https://github.com/pulumi/pulumi-azure-native/issues/1013

type SecretProps = Required<NamedWithVaultType> & {
  value: Input<string>;

  contentType?: Input<string>;

  tags?: Input<{
    [key: string]: Input<string>;
  }>;
  dependsOn?: Input<Resource> | Input<Input<Resource>[]>;
};

type GetVaultItemProps = Required<NamedWithVaultType> & {
  version?: string;

  nameFormatted?: boolean;
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
      properties: {
        keySize: 4096,
        kty: 'RSA',
        keyOps: [
          'decrypt',
          'encrypt',
          'sign',
          'verify',
          'wrapKey',
          'unwrapKey',
        ],
        //curveName: keyvault.JsonWebKeyCurveName.P_521,
        attributes: { enabled: true, exportable: false },
        rotationPolicy: {
          lifetimeActions: [
            {
              action: { type: keyvault.KeyRotationPolicyActionType.Rotate },
              trigger: { timeBeforeExpiry: 'P30D' },
            },
          ],
          attributes: { expiryTime: 'P1Y' },
        },
      },
      tags,
    },
    { dependsOn, ignoreChanges: ['attributes.expires'] },
  );
};

interface KeyVaultPropertiesResults {
  keyName: Output<string>;
  url: Output<string>;
  keyVaultUri: string;
  keyVersion: Output<string>;
}

export const addEncryptKey = (
  props: Omit<SecretProps, 'value' | 'contentType'>,
): KeyVaultPropertiesResults => {
  const key = addKey({ ...props, name: `${props.name}-encryptKey` });
  return {
    keyName: key.name,
    keyVaultUri: `https://${props.vaultInfo.name}.vault.azure.net`,
    keyVersion: key.keyUriWithVersion.apply((u) => u.split('/').pop()!),
    url: key.keyUriWithVersion,
  };
};

/** Get Key */
export const getKey = async ({
  name,
  version,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps) => {
  const n = nameFormatted ? name : getSecretName(name);
  const client = getKeyVaultBase(vaultInfo.name);
  return client.getKey(n, version);
};

interface EncryptionPropertiesArgs {
  keySource: 'Microsoft.KeyVault';
  keyVaultProperties: Input<KeyVaultPropertiesResults>;
}

/** Get or create encryption Key */
// const getEncryptionKey = async ({
//   name,
//   vaultInfo,
// }: Required<NamedWithVaultType>): Promise<KeyVaultPropertiesResults> => {
//   const n = `${name}-encrypt-key`;
//   const key = await getKeyVaultBase(vaultInfo.name).getOrCreateKey(n);
//   return {
//     keyName: key!.properties.name,
//     keyVaultUri: key!.properties.vaultUrl,
//     keyVersion: key!.properties.version,
//     url: `${key!.properties.vaultUrl}/keys/${key!.properties.name}/${key!.properties.version}`,
//   };
// };

// export const getEncryptionKeyOutput = ({
//   name,
//   vaultInfo,
// }: NamedWithVaultType): Output<KeyVaultPropertiesResults> | undefined => {
//   if (!vaultInfo) return undefined;
//   return output(getEncryptionKey({ name, vaultInfo }));
// };

/** Get Secret */
export const getSecret = async ({
  name,
  version,
  vaultInfo,
  nameFormatted,
}: GetVaultItemProps) => {
  const n = nameFormatted ? name : getSecretName(name);
  const client = getKeyVaultBase(vaultInfo.name);
  return client.getSecret(n, version);
};

export const getSecrets = <T extends Record<string, string>>({
  names,
  vaultInfo,
  nameFormatted,
}: Required<WithVaultInfo> & {
  nameFormatted?: boolean;
  names: T;
}): Record<keyof T, Output<string>> => {
  const rs: Record<string, Output<string>> = {};

  Object.keys(names).forEach((k) => {
    const name = names[k];
    const item = output(getSecret({ name, vaultInfo, nameFormatted }));
    rs[k] = item?.apply((i) => i?.value!);
  });
  return rs as Record<keyof T, Output<string>>;
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
