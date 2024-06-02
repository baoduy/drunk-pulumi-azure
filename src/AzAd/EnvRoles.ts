import Role, { RoleProps } from "./Role";
import { getAdoIdentityInfo } from "./Identities/AzDevOpsIdentity";
import { KeyVaultInfo } from "../types";
import { output, Output } from "@pulumi/pulumi";
import { Group } from "@pulumi/azuread";
import { getSecretName } from "../Common/Naming";
import { addCustomSecret } from "../KeyVault/CustomHelper";
import { getSecret } from "../KeyVault/Helper";

type keyTypes = "readOnly" | "contributor" | "admin";
const envRoleConfig: Record<keyTypes, RoleProps> = {
  readOnly: {
    roleName: "Readonly",
    appName: "Azure",
  },
  contributor: {
    roleName: "Contributor",
    appName: "Azure",
  },
  admin: {
    roleName: "Admin",
    appName: "Azure",
  },
};

const getRoleSecretName = (name: string) => ({
  objectIdName: getSecretName(`envRoles-${name}-object-id`),
  displayName: getSecretName(`envRoles-${name}-display-name`),
});

export const createEnvRoles = ({
  includesAdoIdentityAsAdmin = false,
  vaultInfo,
}: {
  includesAdoIdentityAsAdmin?: boolean;
  vaultInfo: KeyVaultInfo;
}) => {
  const rs: Record<string, Output<Group>> = {};

  Object.keys(envRoleConfig).forEach((key) => {
    const config = envRoleConfig[key as keyTypes];

    if (key === "admin" && includesAdoIdentityAsAdmin) {
      const ado = getAdoIdentityInfo(vaultInfo);
      if (ado.principalId)
        config.members = [ado.principalId.apply((id) => id!)];
    }

    const role = Role(config);
    rs[key] = role;

    //Add to Key Vault
    const secretNames = getRoleSecretName(key);
    addCustomSecret({
      name: secretNames.objectIdName,
      value: role.objectId,
      contentType: secretNames.objectIdName,
      vaultInfo,
    });
    addCustomSecret({
      name: secretNames.displayName,
      value: role.displayName,
      contentType: secretNames.displayName,
      vaultInfo,
    });
  });

  return rs as Record<keyTypes, Output<Group>>;
};

type RoleType = { objectId: string; displayName: string };
export type EnvRolesResults = Record<keyTypes, Output<RoleType>>;

const getEnvRole = async (name: string, vaultInfo: KeyVaultInfo) => {
  const secretNames = getRoleSecretName(name);
  const [objectId, displayName] = await Promise.all([
    getSecret({ name: secretNames.objectIdName, vaultInfo }),
    getSecret({ name: secretNames.displayName, vaultInfo }),
  ]);
  return {
    displayName: displayName!.value!,
    objectId: objectId!.value!,
  };
};

export const getEnvRolesOutput = async (vaultInfo: KeyVaultInfo) => {
  const rs: Record<string, Output<RoleType>> = {};

  Object.keys(envRoleConfig).forEach((key) => {
    rs[key] = output(getEnvRole(key, vaultInfo));
  });

  return rs as EnvRolesResults;
};
