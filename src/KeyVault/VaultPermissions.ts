import * as pulumi from "@pulumi/pulumi";
import { roleAssignment } from "../AzAd/RoleAssignment";
import * as native from "@pulumi/azure-native";
import * as azuread from "@pulumi/azuread";
import { addCustomSecret } from "./CustomHelper";
import { KeyVaultInfo } from "../types";
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
