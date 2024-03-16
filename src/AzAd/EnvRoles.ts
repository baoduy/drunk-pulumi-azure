import { currentEnv, defaultScope } from '../Common/AzureEnv';
import Role, { getRoleName, RoleNameType } from './Role';
import { getAdoIdentity } from './Identities/AzDevOps';
import { addUserToGroup } from './Group';

const envRoleConfig = {
  readOnly: {
    env: currentEnv,
    roleName: 'Readonly',
    appName: 'Azure',
  } as RoleNameType,
  contributor: {
    env: currentEnv,
    roleName: 'Contributor',
    appName: 'Azure',
  } as RoleNameType,
  admin: {
    env: currentEnv,
    roleName: 'Admin',
    appName: 'Azure',
  } as RoleNameType,
};

export type EnvRoleNamesType = { [k in keyof typeof envRoleConfig]: string };

export const getEnvRoleNames = (
  includeOrganization = true
): EnvRoleNamesType => ({
  readOnly: getRoleName({ ...envRoleConfig.readOnly, includeOrganization }),
  contributor: getRoleName({
    ...envRoleConfig.contributor,
    includeOrganization,
  }),
  admin: getRoleName({ ...envRoleConfig.admin, includeOrganization }),
});

export default (includeOrganization = true) => {
  //ReadOnly
   Role({
    ...envRoleConfig.readOnly,
    includeOrganization,
    permissions: [{ roleName: 'Reader', scope: defaultScope }],
  });
  //Contributor
   Role({
    ...envRoleConfig.contributor,
    includeOrganization,
    permissions: [{ roleName: 'Reader', scope: defaultScope }],
  });
  //Admin
  const adminGroup =  Role({
    ...envRoleConfig.admin,
    includeOrganization,
    permissions: [{ roleName: 'Reader', scope: defaultScope }],
  });

  //Add Global ADO Identity as Admin
  const ado = getAdoIdentity();
  addUserToGroup({
    name: 'ado-admin-role',
    groupObjectId: adminGroup.objectId,
    objectId: ado.principal.objectId,
  });

  return getEnvRoleNames(includeOrganization);
};
