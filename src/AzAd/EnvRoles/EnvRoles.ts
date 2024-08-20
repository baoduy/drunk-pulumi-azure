import { grantEnvRolesAccess } from './EnvRoles.Consts';
import { Role, RoleProps } from '../Roles';
import { KeyVaultInfo } from '../../types';
import { output, Output } from '@pulumi/pulumi';
import { defaultSubScope } from '../../Common';
import { addCustomSecrets } from '../../KeyVault/CustomHelper';
import { getSecret, getVaultItemName } from '../../KeyVault/Helper';

export type EnvRoleKeyTypes = 'readOnly' | 'contributor' | 'admin';

const envRoleConfig: Record<EnvRoleKeyTypes, RoleProps> = {
  readOnly: {
    roleName: 'Readonly',
    appName: 'Azure',
  },
  contributor: {
    roleName: 'Contributor',
    appName: 'Azure',
  },
  admin: {
    roleName: 'Admin',
    appName: 'Azure',
  },
};

type EnvRoleInfoType = { objectId: string; displayName: string };
export type EnvRolesInfo = Record<
  EnvRoleKeyTypes,
  Output<EnvRoleInfoType> | EnvRoleInfoType
>;

const getRoleSecretName = (name: string) => ({
  objectIdName: getVaultItemName(`envRoles-${name}-object-id`),
  displayName: getVaultItemName(`envRoles-${name}-display-name`),
});

export type CreateEnvRolesType = EnvRolesInfo & {
  pushToVault: (vaultInfo: KeyVaultInfo) => void;
};

export const pushEnvRolesToVault = (
  envRoles: EnvRolesInfo,
  vaultInfo: KeyVaultInfo,
) => {
  Object.keys(envRoleConfig).forEach((key) => {
    const role = envRoles[key as EnvRoleKeyTypes];
    //Add to Key Vault
    const secretNames = getRoleSecretName(key);
    addCustomSecrets({
      vaultInfo,
      contentType: 'Env Roles',
      items: [
        { name: secretNames.objectIdName, value: role.objectId },
        { name: secretNames.displayName, value: role.displayName },
      ],
    });
  });
};

export const createEnvRoles = () => {
  const groups: EnvRolesInfo = {} as any;

  Object.keys(envRoleConfig).forEach((key) => {
    const k = key as EnvRoleKeyTypes;
    const config = envRoleConfig[k];
    const g = Role(config);

    groups[k] = output([g.objectId, g.displayName]).apply(([i, d]) => ({
      objectId: i,
      displayName: d,
    }));
  });

  const pushToVault = (vaultInfo: KeyVaultInfo) =>
    pushEnvRolesToVault(groups, vaultInfo);

  //Allows Some Subscription level access
  //1. Allows to AcrPull
  grantEnvRolesAccess({
    envRoles: groups,
    name: 'envRoles-SubScope-Access',
    scope: defaultSubScope,
    enableACRRoles: { contributor: true },
  });

  return {
    ...groups,
    pushToVault,
  } as CreateEnvRolesType;
};

/** Get Single Env Role Object */
const getEnvRole = async (name: string, vaultInfo: KeyVaultInfo) => {
  const secretNames = getRoleSecretName(name);

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

  return rs as EnvRolesInfo;
};
