import {
  getIdentityName,
  getManagedIdentityName,
  getSecretName,
  parseResourceInfoFromId,
} from '../Common';
import { getSecret } from '../KeyVault/Helper';
import {
  IdentityInfo,
  IdentityRoleAssignment,
  KeyVaultInfo,
  NamedType,
  NamedWithVaultType,
} from '../types';
import { Input, output } from '@pulumi/pulumi';
import { EnvRoleKeyTypes, getEnvRole } from './EnvRoles';
import { roleAssignment } from './RoleAssignment';
import { addMemberToGroup } from './Group';

interface Props extends NamedType {
  includePrincipal?: boolean;
  vaultInfo: KeyVaultInfo;
}

export type IdentityInfoResults = {
  objectId: string;
  clientId: string;
  clientSecret?: string;
  principalObjectId?: string;
  principalId?: string;
  principalSecret?: string;
};

export const getIdentitySecretNames = (name: string) => ({
  objectIdName: getSecretName(`${name}-object-id`),
  clientIdKeyName: getSecretName(`${name}-client-id`),
  clientSecretKeyName: getSecretName(`${name}-client-secret`),
  principalIdKeyName: getSecretName(`${name}-principal-id`),
  principalSecretKeyName: getSecretName(`${name}-principal-secret`),
});

export const getIdentityInfo = async ({
  name,
  vaultInfo,
  includePrincipal,
}: Props): Promise<IdentityInfoResults> => {
  name = getIdentityName(name);
  const secretNames = getIdentitySecretNames(name);

  const [objectId, clientId, clientSecret] = await Promise.all([
    getSecret({ name: secretNames.objectIdName, vaultInfo }),
    getSecret({ name: secretNames.clientIdKeyName, vaultInfo }),
    getSecret({ name: secretNames.clientSecretKeyName, vaultInfo }),
  ]);

  const [principalId, principalSecret] = includePrincipal
    ? await Promise.all([
        getSecret({ name: secretNames.principalIdKeyName, vaultInfo }),
        getSecret({ name: secretNames.principalSecretKeyName, vaultInfo }),
      ])
    : [undefined, undefined];

  return {
    objectId: objectId!.value!,
    clientId: clientId!.value!,
    clientSecret: clientSecret?.value,
    principalId: principalId?.value,
    principalSecret: principalSecret?.value,
  };
};

export const getIdentityInfoOutput = (props: Props) =>
  output<IdentityInfoResults>(getIdentityInfo(props));

const grantIdentityToResourceRoles = ({
  name,
  roles,
  principalId,
}: NamedType & {
  roles: Array<{ name: string; scope: Input<string> }>;
  principalId: Input<string>;
}) =>
  roles.map((r) =>
    roleAssignment({
      name,
      roleName: r.name,
      principalId: principalId,
      principalType: 'ServicePrincipal',
      scope: r.scope,
    }),
  );

const grantIdentityEnvRolesGroup = ({
  name,
  roleType,
  vaultInfo,
  principalId,
}: Required<NamedWithVaultType> & {
  roleType: EnvRoleKeyTypes;
  principalId: Input<string>;
}) => {
  const role = output(getEnvRole(roleType, vaultInfo));
  return role.apply((r) => {
    if (!role.objectId) return;
    return addMemberToGroup({
      name,
      objectId: principalId,
      groupObjectId: r.objectId,
    });
  });
};

export const grantIdentityPermissions = ({
  name,
  principalId,
  vaultInfo,
  role,
}: IdentityRoleAssignment &
  NamedType & {
    principalId: Input<string>;
  }) => {
  // if (roles) {
  //   grantIdentityToResourceRoles({ name, roles, principalId });
  // }
  if (role && vaultInfo) {
    grantIdentityEnvRolesGroup({
      name,
      roleType: role,
      principalId,
      vaultInfo,
    });
  }
};

export const getUserAssignedIdentityInfo = async (
  name: string,
  vaultInfo: KeyVaultInfo,
): Promise<IdentityInfo> => {
  name = getManagedIdentityName(name);
  const id = await getSecret({
    name: `${name}-id`,
    vaultInfo,
    nameFormatted: true,
  });
  const principalId = await getSecret({
    name: `${name}-principalId`,
    vaultInfo,
    nameFormatted: true,
  });

  const info = parseResourceInfoFromId(id!.value!);
  return {
    name: info!.name!,
    group: info!.group!,
    id: info!.id!,
    principalId: principalId!.value!,
  };
};

export const getUserAssignedIdentityInfoOutput = (
  name: string,
  vaultInfo: KeyVaultInfo,
) => output<IdentityInfo>(getUserAssignedIdentityInfo(name, vaultInfo));
