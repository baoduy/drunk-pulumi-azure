import { currentEnv } from "../Common/AzureEnv";
import Role, { getRoleName, RoleNameType } from "./Role";
import { getAdoIdentity } from "./Identities/AzDevOps";
import { addMemberToGroup } from "./Group";

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

export const createVaultRoles = (
  name: string,
  addGlobalADOIdentity?: boolean,
) => {
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

  //Add Global ADO Identity as Admin
  if (addGlobalADOIdentity) {
    const ado = getAdoIdentity();
    addMemberToGroup({
      name: "ado-admin-role",
      groupObjectId: adminGroup.objectId,
      objectId: ado.principal.objectId,
    });
  }

  return { adminGroup, readOnlyGroup, addGlobalADOIdentity };
};
