import { naming } from '../Common';
import { getSecret, getVaultItemName } from '../KeyVault/Helper';
import { IdentityInfo, KeyVaultInfo, WithNamedType } from '../types';
import { output } from '@pulumi/pulumi';

interface Props extends WithNamedType {
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
  objectIdName: getVaultItemName(`${name}-object-id`),
  clientIdKeyName: getVaultItemName(`${name}-client-id`),
  clientSecretKeyName: getVaultItemName(`${name}-client-secret`),
  principalIdKeyName: getVaultItemName(`${name}-principal-id`),
  principalSecretKeyName: getVaultItemName(`${name}-principal-secret`),
});

export const getIdentityInfo = async ({
  name,
  vaultInfo,
  includePrincipal,
}: Props): Promise<IdentityInfoResults> => {
  name = naming.getIdentityName(name);
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

// const grantIdentityToResourceRoles = ({
//   name,
//   roles,
//   principalId,
// }: WithNamedType & {
//   roles: Array<{ name: string; scope: Input<string> }>;
//   principalId: Input<string>;
// }) =>
//   roles.map((r) =>
//     roleAssignment({
//       name,
//       roleName: r.name,
//       principalId: principalId,
//       principalType: 'ServicePrincipal',
//       scope: r.scope,
//     }),
//   );

// const grantIdentityEnvRolesGroup = ({
//   name,
//   roleType,
//   vaultInfo,
//   principalId,
// }: Required<NamedWithVaultType> & {
//   roleType: EnvRoleKeyTypes;
//   principalId: Input<string>;
// }) => {
//   const role = output(getEnvRole(roleType, vaultInfo));
//   return role.apply((r) => {
//     if (!role.objectId) return;
//     return addMemberToGroup({
//       name,
//       objectId: principalId,
//       groupObjectId: r.objectId,
//     });
//   });
// };

// export const grantIdentityPermissions = ({
//   name,
//   principalId,
//   vaultInfo,
//   role,
// }: IdentityRoleAssignment &
//   WithNamedType & {
//     principalId: Input<string>;
//   }) => {
//   // if (roles) {
//   //   grantIdentityToResourceRoles({ name, roles, principalId });
//   // }
//   if (role && vaultInfo) {
//     grantIdentityEnvRolesGroup({
//       name,
//       roleType: role,
//       principalId,
//       vaultInfo,
//     });
//   }
// };

export const getUserAssignedIdentityInfo = (
  name: string,
  vaultInfo: KeyVaultInfo,
): IdentityInfo => {
  name = naming.getUIDName(name);

  const id = output(
    getSecret({
      name: `${name}-id`,
      vaultInfo,
      nameFormatted: true,
    }),
  );
  const principalId = output(
    getSecret({
      name: `${name}-principalId`,
      vaultInfo,
      nameFormatted: true,
    }),
  );

  return {
    id: id?.apply((i) => i?.value!),
    principalId: principalId?.apply((i) => i?.value!),
  };
};
