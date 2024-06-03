import { getIdentityName, getSecretName } from "../Common/Naming";
import { getSecret } from "../KeyVault/Helper";
import { IdentityRoleAssignment, KeyVaultInfo } from "../types";
import { Input, output, Resource } from "@pulumi/pulumi";
import { EnvRoleKeyTypes, getEnvRole } from "./EnvRoles";
import { replaceAll } from "../Common/Helpers";
import { roleAssignment } from "./RoleAssignment";
import { getRoleNames, RoleEnableTypes } from "./EnvRoles.Consts";
import { addMemberToGroup } from "./Group";

interface Props {
  name: string;
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

// export const grantIdentityRolesAccess = ({
//   name,
//   principalId,
//   scope,
//   roleType,
//   additionRoles,
//   dependsOn,
//   ...others
// }: RoleEnableTypes & {
//   name: string;
//   principalId: Input<string>;
//   scope: Input<string>;
//   roleType: EnvRoleKeyTypes;
//   additionRoles?: string[];
//   dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
// }) => {
//   const roles = getRoleNames(others);
//   const finalRoles = new Set(additionRoles);
//
//   if (roleType === "readOnly") roles.readOnly.forEach((r) => finalRoles.add(r));
//   if (roleType === "contributor")
//     roles.contributor.forEach((r) => finalRoles.add(r));
//   if (roleType === "admin") roles.admin.forEach((r) => finalRoles.add(r));
//
//   Array.from(finalRoles)
//     .sort()
//     .forEach((r) => {
//       const n = `${name}-${roleType}-${replaceAll(r, " ", "")}`;
//       roleAssignment({
//         name: n,
//         principalId,
//         principalType: "ServicePrincipal",
//         roleName: r,
//         scope,
//         dependsOn,
//       });
//     });
// };

const grantIdentityToResourceRoles = ({
  name,
  roles,
  principalId,
}: {
  name: string;
  roles: Array<{ name: string; scope: Input<string> }>;
  principalId: Input<string>;
}) =>
  roles.map((r) =>
    roleAssignment({
      name,
      roleName: r.name,
      principalId: principalId,
      principalType: "ServicePrincipal",
      scope: r.scope,
    }),
  );

const grantIdentityEnvRolesGroup = ({
  name,
  roleType,
  vaultInfo,
  principalId,
}: {
  name: string;
  roleType: EnvRoleKeyTypes;
  principalId: Input<string>;
  vaultInfo: KeyVaultInfo;
}) => {
  const role = output(getEnvRole(roleType, vaultInfo));
  return addMemberToGroup({
    name,
    objectId: principalId,
    groupObjectId: role.objectId,
  });
};

export const grantIdentityPermissions = ({
  name,
  principalId,
  vaultInfo,
  roles,
  envRole,
}: IdentityRoleAssignment & {
  name: string;
  principalId: Input<string>;
}) => {
  if (roles) {
    grantIdentityToResourceRoles({ name, roles, principalId });
  }
  if (envRole && vaultInfo) {
    grantIdentityEnvRolesGroup({
      name,
      roleType: envRole,
      principalId,
      vaultInfo,
    });
  }
};
