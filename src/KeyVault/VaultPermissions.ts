import * as pulumi from "@pulumi/pulumi";
import { roleAssignment } from "../AzAd/RoleAssignment";
import * as native from "@pulumi/azure-native";
import * as azuread from "@pulumi/azuread";
import { addCustomSecret } from "./CustomHelper";
import { KeyVaultInfo } from "../types";
import { getAdoIdentity } from "../AzAd/Identities/AzDevOpsIdentity";
import { getVaultRoleNames } from "./Helper";
import { addMemberToGroup, getAdGroup } from "../AzAd/Group";

export interface PermissionProps {
  /** The object ID of a user, service principal or security group in the Azure Active Directory tenant for the vault. The object ID must be unique for the list of access policies. */
  objectId: pulumi.Input<string>;
  /** Application ID of the client making request on behalf of a principal */
  applicationId?: pulumi.Input<string>;
  permission: "ReadOnly" | "ReadWrite";
  principalType?: native.authorization.PrincipalType;
}

const grantVaultRbacPermission = ({
  name,
  objectId,
  permission,
  scope,
  principalType = "User",
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
  if (permission === "ReadOnly") {
    roleAssignment({
      ...defaultProps,
      name: `${vn}-encrypt`,
      roleName: "Key Vault Crypto Service Encryption User",
      principalType,
    });
    roleAssignment({
      ...defaultProps,
      name: `${vn}-crypto`,
      roleName: "Key Vault Crypto User",
      principalType,
    });
    roleAssignment({
      ...defaultProps,
      name: `${vn}-secret`,
      roleName: "Key Vault Secrets User",
      principalType,
    });
    //Read and Write
  } else {
    roleAssignment({
      ...defaultProps,
      name: `${vn}-contributor`,
      roleName: "Key Vault Administrator",
      principalType,
    });
    roleAssignment({
      ...defaultProps,
      name: `${vn}-cert`,
      roleName: "Key Vault Certificates Officer",
      principalType,
    });
    roleAssignment({
      ...defaultProps,
      name: `${vn}-crypto`,
      roleName: "Key Vault Crypto Officer",
      principalType,
    });
    roleAssignment({
      ...defaultProps,
      name: `${vn}-secret`,
      roleName: "Key Vault Secrets Officer",
      principalType,
    });
  }
};

export const grantVaultAccessToIdentity = ({
  name,
  identity,
  vaultInfo,
}: {
  name: string;
  identity: pulumi.Output<{ principalId: string } | undefined>;
  vaultInfo: KeyVaultInfo;
}) =>
  identity.apply(async (i) => {
    if (!i) return;
    const vaultRole = await getVaultRoleNames(vaultInfo);
    if (!vaultRole) return;

    addMemberToGroup({
      name: `${name}-identity-readAccess-${vaultInfo.name}`,
      objectId: i.principalId,
      groupObjectId: getAdGroup(vaultRole.readOnly).objectId,
    });
  });

export const grantVaultPermissionToRole = ({
  name,
  vaultInfo,
  roles,
}: {
  name: string;
  vaultInfo: KeyVaultInfo;
  roles: {
    adminGroup: pulumi.Output<azuread.Group>;
    readOnlyGroup: pulumi.Output<azuread.Group>;
    addGlobalADOIdentity?: boolean;
  };
}) => {
  //Grant RBAC permission to Group
  grantVaultRbacPermission({
    name: `${name}-ReadOnlyGroup`,
    scope: vaultInfo.id,
    objectId: roles.readOnlyGroup.objectId,
    permission: "ReadOnly",
    principalType: "Group",
  });

  grantVaultRbacPermission({
    name: `${name}-AdminGroup`,
    scope: vaultInfo.id,
    objectId: roles.adminGroup.objectId,
    permission: "ReadWrite",
    principalType: "Group",
  });

  if (roles.addGlobalADOIdentity) {
    //Grant Admin RBAC permission current ADO Identity as the Group will be take time to be effective
    const ado = getAdoIdentity();
    grantVaultRbacPermission({
      name: `${name}-Admin-Ado`,
      scope: vaultInfo.id,
      objectId: ado.principal.objectId,
      permission: "ReadWrite",
      principalType: "ServicePrincipal",
    });
  }

  //Add RoleNames to vault
  addCustomSecret({
    name: "VaultRoleNames",
    value: pulumi
      .output({
        admin: roles.adminGroup.displayName,
        readOnly: roles.readOnlyGroup.displayName,
      })
      .apply((role) => JSON.stringify(role)),
    vaultInfo,
    contentType: "KeyVault Roles Names",
  });
};

// export const KeyVaultAdminPolicy = {
//   certificates: [
//     'Backup',
//     'Create',
//     'Delete',
//     'DeleteIssuers',
//     'Get',
//     'GetIssuers',
//     'Import',
//     'List',
//     'ManageContacts',
//     'ManageIssuers',
//     'Purge',
//     'Recover',
//     'Restore',
//     'SetIssuers',
//     'Update',
//   ],
//   keys: [
//     'Backup',
//     'Create',
//     'Decrypt',
//     'Delete',
//     'Encrypt',
//     'Get',
//     'Import',
//     'List',
//     'Purge',
//     'Recover',
//     'Restore',
//     'Sign',
//     'UnwrapKey',
//     'Update',
//     'Verify',
//     'WrapKey',
//   ],
//   secrets: [
//     'Backup',
//     'Delete',
//     'Get',
//     'List',
//     'Purge',
//     'Recover',
//     'Restore',
//     'Set',
//   ],
//   storage: [
//     'Backup',
//     'Delete',
//     'DeleteSAS',
//     'Get',
//     'GetSAS',
//     'List',
//     'ListSAS',
//     'Purge',
//     'Recover',
//     'RegenerateKey',
//     'Restore',
//     'Set',
//     'SetSAS',
//     'Update',
//   ],
// };
//
// export const KeyVaultReadOnlyPolicy = {
//   certificates: ['Get', 'List'],
//   keys: [
//     'Get',
//     'List',
//     'Decrypt',
//     'Encrypt',
//     'Sign',
//     'UnwrapKey',
//     'Verify',
//     'WrapKey',
//   ],
//   secrets: ['Get', 'List'],
//   storage: ['Get', 'List'],
// };

// export const grantVaultAccessPolicy = ({
//   name,
//   objectId,
//   permission,
//   vaultInfo,
// }: PermissionProps & {
//   name: string;
//   vaultInfo: KeyVaultInfo;
// }) =>
//   new vault.AccessPolicy(name, {
//     keyVaultId: vaultInfo.id,
//     objectId,
//     tenantId,
//     certificatePermissions:
//       permission === 'ReadOnly'
//         ? KeyVaultReadOnlyPolicy.certificates
//         : KeyVaultAdminPolicy.certificates,
//     keyPermissions:
//       permission === 'ReadOnly'
//         ? KeyVaultReadOnlyPolicy.keys
//         : KeyVaultAdminPolicy.keys,
//     secretPermissions:
//       permission === 'ReadOnly'
//         ? KeyVaultReadOnlyPolicy.secrets
//         : KeyVaultAdminPolicy.secrets,
//     storagePermissions:
//       permission === 'ReadOnly'
//         ? KeyVaultReadOnlyPolicy.storage
//         : KeyVaultAdminPolicy.storage,
//   });
