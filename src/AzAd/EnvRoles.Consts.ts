import { EnvRoleKeyTypes, EnvRolesResults } from './EnvRoles';
import { roleAssignment, RoleAssignmentProps } from './RoleAssignment';
import { replaceAll } from '../Common/Helpers';

//Resource Group Role
const RGRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: ['Reader'],
  contributor: ['Contributor'],
  admin: ['Owner'],
};

//AKS Roles
const AksRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: [
    'Azure Kubernetes Service Cluster User Role',
    'Azure Kubernetes Service Cluster Monitoring User',
  ],
  contributor: [
    'Azure Kubernetes Service Contributor Role',
    'Azure Kubernetes Service Cluster User Role',
    'Azure Kubernetes Service Cluster Monitoring User',
    'Azure Kubernetes Service RBAC Reader',
  ],
  admin: [
    'Azure Kubernetes Service Contributor Role',
    'Azure Kubernetes Service RBAC Cluster Admin',
    'Azure Kubernetes Service Cluster Admin Role',
    'Azure Kubernetes Service Cluster Monitoring User',
    'Azure Kubernetes Service Cluster User Role',
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
    'ACR Registry Catalog Lister',
    'ACR Repository Reader',
    'AcrQuarantineReader',
  ],
  contributor: [
    'AcrImageSigner',
    'AcrPull',
    'AcrPush',
    'ACR Repository Contributor',
    'ACR Repository Writer',
    'AcrQuarantineWriter',
  ],
  admin: ['AcrDelete'],
};

export type RoleEnableTypes = {
  enableRGRoles?: boolean;
  enableAksRoles?: boolean;
  enableStorageRoles?: boolean;
  enableIotRoles?: boolean;
  enableVaultRoles?: boolean;
  /** Container Registry Roles */
  enableACRRoles?: boolean;
};

export const getRoleNames = ({
  enableRGRoles,
  enableIotRoles,
  enableVaultRoles,
  enableAksRoles,
  enableStorageRoles,
  enableACRRoles,
}: RoleEnableTypes): Record<EnvRoleKeyTypes, string[]> => {
  const rs = {
    readOnly: new Set<string>(),
    admin: new Set<string>(),
    contributor: new Set<string>(),
  };

  if (enableIotRoles) {
    IOTHubRoleNames.readOnly.forEach((r) => rs.readOnly.add(r));
    IOTHubRoleNames.contributor.forEach((r) => rs.contributor.add(r));
    IOTHubRoleNames.admin.forEach((r) => rs.admin.add(r));
  }

  if (enableRGRoles) {
    RGRoleNames.readOnly.forEach((r) => rs.readOnly.add(r));
    RGRoleNames.contributor.forEach((r) => rs.contributor.add(r));
    RGRoleNames.admin.forEach((r) => rs.admin.add(r));
  }

  if (enableVaultRoles) {
    KeyVaultRoleNames.readOnly.forEach((r) => rs.readOnly.add(r));
    KeyVaultRoleNames.contributor.forEach((r) => rs.contributor.add(r));
    KeyVaultRoleNames.admin.forEach((r) => rs.admin.add(r));
  }

  if (enableAksRoles) {
    AksRoleNames.readOnly.forEach((r) => rs.readOnly.add(r));
    AksRoleNames.contributor.forEach((r) => rs.contributor.add(r));
    AksRoleNames.admin.forEach((r) => rs.admin.add(r));
  }

  if (enableStorageRoles) {
    StorageRoleNames.readOnly.forEach((r) => rs.readOnly.add(r));
    StorageRoleNames.contributor.forEach((r) => rs.contributor.add(r));
    StorageRoleNames.admin.forEach((r) => rs.admin.add(r));
  }

  if (enableACRRoles) {
    ContainerRegistry.readOnly.forEach((r) => rs.readOnly.add(r));
    ContainerRegistry.contributor.forEach((r) => rs.contributor.add(r));
    ContainerRegistry.admin.forEach((r) => rs.admin.add(r));
  }

  return {
    readOnly: Array.from(rs.readOnly).sort(),
    admin: Array.from(rs.admin).sort(),
    contributor: Array.from(rs.contributor).sort(),
  };
};

export const grantEnvRolesAccess = ({
  name,
  envRoles,
  ...others
}: RoleEnableTypes &
  Omit<RoleAssignmentProps, 'roleName' | 'principalType' | 'principalId'> & {
    envRoles: EnvRolesResults;
  }) => {
  const roles = getRoleNames(others);

  if (envRoles.readOnly.objectId) {
    //ReadOnly
    roles.readOnly.forEach((r) => {
      const n = `${name}-readonly-${replaceAll(r, ' ', '')}`;
      roleAssignment({
        name: n,
        principalId: envRoles.readOnly.objectId,
        principalType: 'Group',
        roleName: r,
        ...others,
      });
    });
  }

  if (envRoles.contributor.objectId) {
    //Contributors
    roles.contributor.forEach((r) => {
      const n = `${name}-contributor-${replaceAll(r, ' ', '')}`;
      roleAssignment({
        name: n,
        principalId: envRoles.contributor.objectId,
        principalType: 'Group',
        roleName: r,
        ...others,
      });
    });
  }

  if (envRoles.admin.objectId) {
    //Admin
    roles.admin.forEach((r) => {
      const n = `${name}-admin-${replaceAll(r, ' ', '')}`;
      roleAssignment({
        name: n,
        principalId: envRoles.admin.objectId,
        principalType: 'Group',
        roleName: r,
        ...others,
      });
    });
  }
};
