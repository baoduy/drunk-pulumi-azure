import * as pulumi from '@pulumi/pulumi';
import { roleAssignment } from '../AzAd/RoleAssignment';
import * as vault from '@pulumi/azure/keyvault';
import { KeyVaultInfo } from '../types';
import { tenantId } from '../Common/AzureEnv';

export interface PermissionProps {
  /** The object ID of a user, service principal or security group in the Azure Active Directory tenant for the vault. The object ID must be unique for the list of access policies. */
  objectId: pulumi.Input<string>;
  /** Application ID of the client making request on behalf of a principal */
  applicationId?: pulumi.Input<string>;
  permission: 'ReadOnly' | 'ReadWrite';
}

export const grantVaultRbacPermission = async ({
  name,
  objectId,
  permission,
  scope,
}: PermissionProps & {
  name: string;
  scope: pulumi.Input<string>;
}) => {
  const vn = `${name}-${permission}`.toLowerCase();

  const defaultProps = {
    principalId: objectId,
    scope,
  };

  //ReadOnly
  if (permission === 'ReadOnly') {
    await roleAssignment({
      ...defaultProps,
      name: `${vn}-encrypt`,
      roleName: 'Key Vault Crypto Service Encryption User',
    });
    await roleAssignment({
      ...defaultProps,
      name: `${vn}-crypto`,
      roleName: 'Key Vault Crypto User',
    });
    await roleAssignment({
      ...defaultProps,
      name: `${vn}-secret`,
      roleName: 'Key Vault Secrets User',
    });
    //Read and Write
  } else {
    await roleAssignment({
      ...defaultProps,
      name: `${vn}-cert`,
      roleName: 'Key Vault Certificates Officer',
    });
    await roleAssignment({
      ...defaultProps,
      name: `${vn}-crypto`,
      roleName: 'Key Vault Crypto Officer',
    });
    await roleAssignment({
      ...defaultProps,
      name: `${vn}-secret`,
      roleName: 'Key Vault Secrets Officer',
    });
  }
};

export const KeyVaultAdminPolicy = {
  certificates: [
    'backup',
    'create',
    'delete',
    'deleteissuers',
    'get',
    'getissuers',
    'import',
    'list',
    'managecontacts',
    'manageissuers',
    'purge',
    'recover',
    'restore',
    'setissuers',
    'update',
  ],
  keys: [
    'backup',
    'create',
    'decrypt',
    'delete',
    'encrypt',
    'get',
    'import',
    'list',
    'purge',
    'recover',
    'restore',
    'sign',
    'unwrapKey',
    'update',
    'verify',
    'wrapKey',
  ],
  secrets: [
    'backup',
    'delete',
    'get',
    'list',
    'purge',
    'recover',
    'restore',
    'set',
  ],
  storage: [
    'backup',
    'delete',
    'deletesas',
    'get',
    'getsas',
    'list',
    'listsas',
    'purge',
    'recover',
    'regeneratekey',
    'restore',
    'set',
    'setsas',
    'update',
  ],
};

export const KeyVaultReadOnlyPolicy = {
  certificates: ['get', 'list'],
  keys: [
    'get',
    'list',
    'decrypt',
    'encrypt',
    'sign',
    'unwrapKey',
    'verify',
    'wrapKey',
  ],
  secrets: ['get', 'list'],
  storage: ['get', 'list'],
};

export const grantVaultAccessPolicy = ({
  name,
  objectId,
  permission,
  vaultInfo,
}: PermissionProps & {
  name: string;
  vaultInfo: KeyVaultInfo;
}) =>
  new vault.AccessPolicy(name, {
    keyVaultId: vaultInfo.id,
    objectId,
    tenantId,
    certificatePermissions:
      permission === 'ReadOnly'
        ? KeyVaultReadOnlyPolicy.certificates
        : KeyVaultAdminPolicy.certificates,
    keyPermissions:
      permission === 'ReadOnly'
        ? KeyVaultReadOnlyPolicy.keys
        : KeyVaultAdminPolicy.keys,
    secretPermissions:
      permission === 'ReadOnly'
        ? KeyVaultReadOnlyPolicy.secrets
        : KeyVaultAdminPolicy.secrets,
    storagePermissions:
      permission === 'ReadOnly'
        ? KeyVaultReadOnlyPolicy.storage
        : KeyVaultAdminPolicy.storage,
  });
