import { roleAssignment, RoleAssignmentProps } from '../Roles';
import {
  EnvRoleKeyTypes,
  EnvRolesInfo,
  ListRoleType,
  RoleEnableItem,
  RoleEnableTypes,
} from '../../types';

const getRoleFor = (
  roleType: RoleEnableItem | undefined,
  roleCollection: Record<EnvRoleKeyTypes, string[]>,
  results: ListRoleType,
) => {
  if (!roleType) return results;

  const allows = {
    readOnly: typeof roleType === 'boolean' ? roleType : roleType.readOnly,
    contributor:
      typeof roleType === 'boolean' ? roleType : roleType.contributor,
    admin: typeof roleType === 'boolean' ? roleType : roleType.admin,
  };

  if (allows.readOnly) {
    roleCollection.readOnly.forEach((r) => results.readOnly.add(r));
  }
  if (allows.contributor) {
    roleCollection.contributor.forEach((r) => results.contributor.add(r));
  }
  if (allows.admin) {
    roleCollection.admin.forEach((r) => results.admin.add(r));
  }

  return results;
};

export const grantEnvRolesAccess = ({
  name,
  envRoles,
  scope,
  dependsOn,
  ...others
}: RoleEnableTypes &
  Omit<RoleAssignmentProps, 'roleName' | 'principalType' | 'principalId'> & {
    envRoles: EnvRolesInfo;
  }) => {
  const roles = getRoleNames(others);
  Object.keys(envRoles).forEach((k) => {
    const type = k as EnvRoleKeyTypes;
    const objectId = envRoles[type].objectId;
    if (!objectId) {
      console.warn(
        `The Env role '${type}' was ignored as the objectId was NULL.`,
      );
      return;
    }

    const n = `${name}-${type}`;
    roles[type].forEach((r) =>
      roleAssignment({
        name: n,
        roleName: r,
        principalId: objectId,
        principalType: 'Group',
        scope,
        dependsOn,
      }),
    );
  });
};

//Resource Group Role
const RGRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: ['Reader'],
  contributor: ['Contributor'],
  admin: ['Owner'],
};

//AKS Roles
const AksRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: [
    'Azure Kubernetes Service RBAC Reader',
    'Azure Kubernetes Service Cluster User Role',
  ],
  contributor: [
    'Azure Kubernetes Service RBAC Writer',
    'Azure Kubernetes Service Cluster User Role',
  ],
  admin: [
    'Azure Kubernetes Service RBAC Cluster Admin',
    'Azure Kubernetes Service RBAC Cluster Admin',
  ],
};

//IOT Roles
const IOTHubRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: ['IoT Hub Data Reader'],
  contributor: ['IoT Hub Data Contributor'],
  admin: ['IoT Hub Registry Contributor', 'IoT Hub Twin Contributor'],
};

//Key Vault Roles
const KeyVaultRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: [
    'Key Vault Crypto Service Encryption User',
    'Key Vault Crypto Service Release User',
    'Key Vault Secrets User',
    'Key Vault Crypto User',
    'Key Vault Certificate User',
    'Key Vault Reader',
  ],
  contributor: [
    'Key Vault Certificates Officer',
    'Key Vault Crypto Officer',
    'Key Vault Secrets Officer',
    'Key Vault Contributor',
  ],
  admin: ['Key Vault Administrator', 'Key Vault Data Access Administrator'],
};

//Storage Roles
const StorageRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: [
    'Storage Blob Data Reader',
    'Storage File Data SMB Share Reader',
    'Storage Queue Data Reader',
    'Storage Table Data Reader',
  ],
  contributor: [
    'Storage Account Backup Contributor',
    'Storage Account Contributor',
    'Storage Account Encryption Scope Contributor Role',
    'Storage Blob Data Contributor',
    'Storage File Data Privileged Reader',
    'Storage File Data SMB Share Contributor',
    'Storage File Data SMB Share Elevated Contributor',
    'Storage Queue Data Contributor',
    'Storage Queue Data Message Processor',
    'Storage Queue Data Message Sender',
    'Storage Table Data Contributor',
  ],
  admin: [
    'Storage Account Key Operator Service Role',
    'Storage Blob Data Owner',
    'Storage File Data Privileged Contributor',
  ],
};

//Container Registry Roles
const ContainerRegistry: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: [
    //'ACR Registry Catalog Lister',
    'ACR Repository Reader',
    'AcrQuarantineReader',
    //'AcrPull',
  ],
  contributor: [
    'AcrImageSigner',
    'AcrPull',
    'AcrPush',

    //'ACR Repository Contributor',
    //'ACR Repository Writer',
    //'AcrQuarantineWriter',
  ],
  admin: ['AcrDelete'],
};

//AppConfig Roles
const AppConfigRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: ['App Configuration Data Reader'],
  contributor: ['App Configuration Data Owner'],
  admin: [],
};

const ServiceBusRoles: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: ['Azure Service Bus Data Receiver'],
  contributor: ['Azure Service Bus Data Sender'],
  admin: ['Azure Service Bus Data Owner'],
};

const SignalRRoles: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: ['SignalR REST API Reader'],
  contributor: ['SignalR App Server'],
  admin: ['SignalR REST API Owner'],
};

// const RedisCacheRoles: Record<EnvRoleKeyTypes, string[]> = {
//   readOnly: ['Azure Service Bus Data Receiver'],
//   contributor: ['Azure Service Bus Data Sender'],
//   admin: ['Azure Service Bus Data Owner'],
// };

export const getRoleNames = ({
  enableRGRoles,
  enableIotRoles,
  enableVaultRoles,
  enableAksRoles,
  enableStorageRoles,
  enableACRRoles,
  enableAppConfig,
  enableServiceBus,
  enableSignalR,
}: RoleEnableTypes): Record<EnvRoleKeyTypes, string[]> => {
  const rs: ListRoleType = {
    readOnly: new Set<string>(),
    admin: new Set<string>(),
    contributor: new Set<string>(),
  };

  getRoleFor(enableIotRoles, IOTHubRoleNames, rs);
  getRoleFor(enableRGRoles, RGRoleNames, rs);
  getRoleFor(enableVaultRoles, KeyVaultRoleNames, rs);
  getRoleFor(enableAksRoles, AksRoleNames, rs);
  getRoleFor(enableStorageRoles, StorageRoleNames, rs);
  getRoleFor(enableACRRoles, ContainerRegistry, rs);
  getRoleFor(enableAppConfig, AppConfigRoleNames, rs);
  getRoleFor(enableServiceBus, ServiceBusRoles, rs);
  getRoleFor(enableSignalR, SignalRRoles, rs);

  return {
    readOnly: Array.from(rs.readOnly).sort(),
    admin: Array.from(rs.admin).sort(),
    contributor: Array.from(rs.contributor).sort(),
  };
};
