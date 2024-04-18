import { currentEnv } from '../Common/AzureEnv';
import Role, { getRoleName, RoleNameType } from './Role';
import { getAdoIdentity } from './Identities/AzDevOps';
import { addMemberToGroup } from './Group';

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

export const getEnvRoleNames = ({
  addAdoIdentityMember = true,
}: {
  addAdoIdentityMember?: boolean;
}): EnvRoleNamesType => ({
  readOnly: getRoleName({ ...envRoleConfig.readOnly }),
  contributor: getRoleName({
    ...envRoleConfig.contributor,
  }),
  admin: getRoleName({ ...envRoleConfig.admin }),
});

export const createEnvRoles = () => {
  //Admin
  const adminGroup = Role({
    ...envRoleConfig.admin,
    //permissions: [{ roleName: 'Reader', scope: defaultScope }],
  });

  //Contributor
  const contributorGroup = Role({
    ...envRoleConfig.contributor,
    //permissions: [{ roleName: 'Reader', scope: defaultScope }],
    members: [adminGroup.objectId],
  });

  //ReadOnly
  const readOnlyGroup = Role({
    ...envRoleConfig.readOnly,
    //permissions: [{ roleName: 'Reader', scope: defaultScope }],
    members: [contributorGroup.objectId],
  });

  if (addAdoIdentityMember) {
    //Add Global ADO Identity as Admin
    const ado = getAdoIdentity();
    addMemberToGroup({
      name: 'ado-admin-role',
      groupObjectId: adminGroup.objectId,
      objectId: ado.principal.objectId,
    });
  }

  return { adminGroup, contributorGroup, readOnlyGroup };
};
