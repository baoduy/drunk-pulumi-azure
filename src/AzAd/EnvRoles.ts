import Role, { RoleProps } from "./Role";
import { KeyVaultInfo } from "../types";
import { output, Output } from "@pulumi/pulumi";
import { Group } from "@pulumi/azuread";
import { getSecretName } from "../Common/Naming";
import { addCustomSecret } from "../KeyVault/CustomHelper";
import { getSecret } from "../KeyVault/Helper";

export type EnvRoleKeyTypes = "readOnly" | "contributor" | "admin";

const envRoleConfig: Record<EnvRoleKeyTypes, RoleProps> = {
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

type EnvRoleInfoType = { objectId: string; displayName: string };
export type EnvRolesResults = Record<
  EnvRoleKeyTypes,
  Output<EnvRoleInfoType> | EnvRoleInfoType
>;

const getRoleSecretName = (name: string) => ({
  objectIdName: getSecretName(`envRoles-${name}-object-id`),
  displayName: getSecretName(`envRoles-${name}-display-name`),
});

export type CreateEnvRolesType = Record<
  EnvRoleKeyTypes,
  Output<EnvRoleInfoType>
> & {
  addRolesToVault: (vaultInfo: KeyVaultInfo) => void;
};

export const createEnvRoles = (): CreateEnvRolesType => {
  const groups: Record<string, Output<EnvRoleInfoType>> = {};

  Object.keys(envRoleConfig).forEach((key) => {
    const config = envRoleConfig[key as EnvRoleKeyTypes];
    const g = Role(config);

    groups[key] = output([g.objectId, g.displayName]).apply(([i, d]) => ({
      objectId: i,
      displayName: d,
    }));
  });

  const addRolesToVault = (vaultInfo: KeyVaultInfo) => {
    Object.keys(groups).forEach((key) => {
      const role = groups[key];
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
  };

  return {
    ...groups,
    addRolesToVault,
  };
};

/** Get Single Env Role Object */
export const getEnvRole = async (name: string, vaultInfo: KeyVaultInfo) => {
  const secretNames = getRoleSecretName(name);
  console.log(`getEnvRole:`, secretNames);

  const [objectId, displayName] = await Promise.all([
    getSecret({ name: secretNames.objectIdName, vaultInfo }),
    getSecret({ name: secretNames.displayName, vaultInfo }),
  ]);

  return {
    displayName: displayName?.value!,
    objectId: objectId?.value!,
  };
};

/** Get All Env Role Objects */
export const getEnvRolesOutput = (vaultInfo: KeyVaultInfo) => {
  const rs: Record<string, Output<EnvRoleInfoType>> = {};

  Object.keys(envRoleConfig).forEach((key) => {
    rs[key] = output(getEnvRole(key, vaultInfo));
  });

  return rs as EnvRolesResults;
};
