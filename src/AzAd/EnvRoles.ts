import Role, { getRoleName, RoleNameType } from './Role';
import { getAdoIdentity } from './Identities/AzDevOps';
import { addMemberToGroup } from './Group';

const envRoleConfig = {
  readOnly: {
    roleName: 'Readonly',
    appName: 'Azure',
  } as RoleNameType,
  contributor: {
    roleName: 'Contributor',
    appName: 'Azure',
  } as RoleNameType,
  admin: {
    roleName: 'Admin',
    appName: 'Azure',
  } as RoleNameType,
};

export type EnvRoleNamesType = { [k in keyof typeof envRoleConfig]: string };

export const getEnvRoleNames = (): EnvRoleNamesType => ({
  readOnly: getRoleName({ ...envRoleConfig.readOnly }),
  contributor: getRoleName({
    ...envRoleConfig.contributor,
  }),
  admin: getRoleName({ ...envRoleConfig.admin }),
});

export const createEnvRoles = ({
  addAdoIdentityMember = true,
}: {
  addAdoIdentityMember?: boolean;
}) => {
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
