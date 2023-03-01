import { currentEnv } from '../Common/AzureEnv';
import Role, { getRoleName, RoleNameType } from './Role';

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

export default async (includeOrganization = true) => {
  //ReadOnly
  await Role({ ...envRoleConfig.readOnly, includeOrganization });
  //Contributor
  await Role({ ...envRoleConfig.contributor, includeOrganization });
  //Admin
  await Role({ ...envRoleConfig.admin, includeOrganization });
};
