import { currentEnv } from "../Common/AzureEnv";
import Role, { getRoleName, RoleNameType } from "./Role";

const getConfig = (name: string) => ({
  readOnly: {
    env: currentEnv,
    roleName: "Readonly",
    appName: "KeyVault",
    moduleName: name,
  } as RoleNameType,
  admin: {
    env: currentEnv,
    roleName: "Admin",
    appName: "KeyVault",
    moduleName: name,
  } as RoleNameType,
});

export const getVaultRoleNames = (name: string) => {
  const vaultRoleConfig = getConfig(name);
  return {
    readOnly: getRoleName({ ...vaultRoleConfig.readOnly }),
    admin: getRoleName({ ...vaultRoleConfig.admin }),
  };
};

export const createVaultRoles = (name: string) => {
  const vaultRoleConfig = getConfig(name);
  //Admin
  const adminGroup = Role({
    ...vaultRoleConfig.admin,
    //permissions: [{ roleName: 'Reader', scope: defaultScope }],
  });

  //ReadOnly
  const readOnlyGroup = Role({
    ...vaultRoleConfig.readOnly,
    //permissions: [{ roleName: 'Reader', scope: defaultScope }],
    members: [adminGroup.objectId],
  });

  return { adminGroup, readOnlyGroup };
};
