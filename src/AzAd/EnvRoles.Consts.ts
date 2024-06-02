import { EnvRoleKeyTypes } from "./EnvRoles";

const RGRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: ["Reader"],
  contributor: ["Contributor"],
  admin: ["Owner"],
};

const AksRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: [
    "Azure Kubernetes Service Cluster User Role",
    "Azure Kubernetes Service Cluster Monitoring User",
  ],
  contributor: [
    "Azure Kubernetes Service Contributor Role",
    "Azure Kubernetes Service Cluster User Role",
    "Azure Kubernetes Service Cluster Monitoring User",
    "Azure Kubernetes Service RBAC Reader",
  ],
  admin: [
    "Azure Kubernetes Service Contributor Role",
    "Azure Kubernetes Service RBAC Cluster Admin",
    "Azure Kubernetes Service Cluster Admin Role",
    "Azure Kubernetes Service Cluster Monitoring User",
    "Azure Kubernetes Service Cluster User Role",
  ],
};

const IOTHubRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: ["IoT Hub Data Reader"],
  contributor: ["IoT Hub Data Contributor"],
  admin: ["IoT Hub Registry Contributor", "IoT Hub Twin Contributor"],
};

const KeyVaultRoleNames: Record<EnvRoleKeyTypes, string[]> = {
  readOnly: [
    "Key Vault Crypto Service Encryption User",
    "Key Vault Crypto User",
    "Key Vault Secrets User",
  ],
  contributor: [
    "Key Vault Administrator",
    "Key Vault Certificates Officer",
    "Key Vault Crypto Officer",
    "Key Vault Secrets Officer",
  ],
  admin: [],
};

export const getRoleNames = ({
  enableRGRoles,
  enableIotRoles,
  enableVaultRoles,
  enableAksRoles,
}: {
  enableRGRoles?: boolean;
  enableAksRoles?: boolean;
  enableIotRoles?: boolean;
  enableVaultRoles?: boolean;
}): Record<EnvRoleKeyTypes, string[]> => {
  const rs: Record<EnvRoleKeyTypes, Set<string>> = {
    readOnly: new Set(),
    admin: new Set(),
    contributor: new Set(),
  };

  if (enableIotRoles) {
    IOTHubRoleNames.readOnly.forEach(rs.readOnly.add);
    IOTHubRoleNames.contributor.forEach(rs.contributor.add);
    IOTHubRoleNames.admin.forEach(rs.admin.add);
  }

  if (enableRGRoles) {
    RGRoleNames.readOnly.forEach(rs.readOnly.add);
    RGRoleNames.contributor.forEach(rs.contributor.add);
    RGRoleNames.admin.forEach(rs.admin.add);
  }

  if (enableVaultRoles) {
    KeyVaultRoleNames.readOnly.forEach(rs.readOnly.add);
    KeyVaultRoleNames.contributor.forEach(rs.contributor.add);
    KeyVaultRoleNames.admin.forEach(rs.admin.add);
  }

  if (enableAksRoles) {
    AksRoleNames.readOnly.forEach(rs.readOnly.add);
    AksRoleNames.contributor.forEach(rs.contributor.add);
    AksRoleNames.admin.forEach(rs.admin.add);
  }

  return {
    readOnly: Array.from(rs.readOnly).sort(),
    admin: Array.from(rs.admin).sort(),
    contributor: Array.from(rs.contributor).sort(),
  };
};
