import {
  EnvRoleKeyTypes,
  EnvRolesResults,
  getEnvRolesOutput,
} from "./EnvRoles";
import { roleAssignment, RoleAssignmentProps } from "./RoleAssignment";
import { replaceAll } from "../Common/Helpers";
import { Input, Resource } from "@pulumi/pulumi";
import { KeyVaultInfo } from "../types";

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
    "Key Vault Crypto Service Release User",
    "Key Vault Secrets User",
    "Key Vault Crypto User",
    "Key Vault Certificate User",
    "Key Vault Reader",
  ],
  contributor: [
    "Key Vault Certificates Officer",
    "Key Vault Crypto Officer",
    "Key Vault Secrets Officer",
    "Key Vault Contributor",
  ],
  admin: ["Key Vault Administrator", "Key Vault Data Access Administrator"],
};

export type RoleEnableTypes = {
  enableRGRoles?: boolean;
  enableAksRoles?: boolean;
  enableIotRoles?: boolean;
  enableVaultRoles?: boolean;
};

export const getRoleNames = ({
  enableRGRoles,
  enableIotRoles,
  enableVaultRoles,
  enableAksRoles,
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

  return {
    readOnly: Array.from(rs.readOnly).sort(),
    admin: Array.from(rs.admin).sort(),
    contributor: Array.from(rs.contributor).sort(),
  };
};

export const grantEnvRolesAccess = ({
  name,
  dependsOn,
  scope,
  envRoles,
  ...others
}: RoleEnableTypes &
  Omit<RoleAssignmentProps, "roleName" | "principalType" | "principalId"> & {
    envRoles: EnvRolesResults;
  }) => {
  const roles = getRoleNames(others);

  if (envRoles.readOnly) {
    //ReadOnly
    roles.readOnly.forEach((r) => {
      const n = `${name}-readonly-${replaceAll(r, " ", "")}`;
      roleAssignment({
        name: n,
        principalId: envRoles.readOnly.objectId,
        principalType: "Group",
        roleName: r,
        scope,
        dependsOn,
      });
    });
  }

  if (envRoles.contributor) {
    //Contributors
    roles.contributor.forEach((r) => {
      const n = `${name}-contributor-${replaceAll(r, " ", "")}`;
      roleAssignment({
        name: n,
        principalId: envRoles.contributor.objectId,
        principalType: "Group",
        roleName: r,
        scope,
        dependsOn,
      });
    });
  }

  if (envRoles.admin) {
    //Admin
    roles.admin.forEach((r) => {
      const n = `${name}-admin-${replaceAll(r, " ", "")}`;
      roleAssignment({
        name: n,
        principalId: envRoles.admin.objectId,
        principalType: "Group",
        roleName: r,
        scope,
        dependsOn,
      });
    });
  }
};
