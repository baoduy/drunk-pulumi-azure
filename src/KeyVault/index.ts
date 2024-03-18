import * as native from "@pulumi/azure-native";
import { enums } from "@pulumi/azure-native/types";
import { Input } from "@pulumi/pulumi";
import {
  currentPrincipal,
  defaultTags,
  subscriptionId,
  tenantId,
} from "../Common/AzureEnv";
import { getKeyVaultName, getPrivateEndpointName } from "../Common/Naming";
import { createDiagnostic } from "../Logs/Helpers";
import { BasicMonitorArgs, PrivateLinkProps } from "../types";
import PrivateEndpoint from "../VNet/PrivateEndpoint";
import { BasicResourceArgs } from "../types";
import { addCustomSecret } from "./CustomHelper";
import { grantVaultRbacPermission } from "./VaultPermissions";
import VaultAccess, { VaultAccessType } from "./VaultAccess";
import { addUserToGroup } from "../AzAd/Group";

interface Props extends BasicResourceArgs {
  //nameConvention?: ConventionProps | false;
  /**The default-encryption-key, tenant-id va subscription-id will be added to the secrets and keys*/
  createDefaultValues?: boolean;

  network?: {
    ipAddresses?: Array<Input<string>>;
    subnetIds?: Array<Input<string>>;
  };

  /** The permission and principals that allows to be access to this Key Vault */
  auth?: VaultAccessType;
}

export default ({
  name,
  //nameConvention,
  group,
  auth = {
    includeOrganization: true,
    //permissions: new Array<PermissionProps>(),
  },
  createDefaultValues,
  network,
  ...others
}: Props) => {
  const vaultName = getKeyVaultName(name);

  const { readOnlyGroup, adminGroup } = VaultAccess({ name, auth });

  // const accessPolicies =
  //   new Array<native.types.input.keyvault.AccessPolicyEntryArgs>();

  //Grant Access permission
  // if (!auth?.enableRbac) {
  //   accessPolicies.push({
  //     objectId: readOnlyGroup.objectId,
  //     tenantId,
  //     permissions: KeyVaultReadOnlyPolicy,
  //   });
  //   accessPolicies.push({
  //     objectId: adminGroup.objectId,
  //     tenantId,
  //     permissions: KeyVaultAdminPolicy,
  //   });
  // }

  const resource = new native.keyvault.Vault(vaultName, {
    vaultName,
    ...group,
    ...others,

    properties: {
      tenantId,
      sku: { name: "standard", family: "A" },
      createMode: "default",

      enableRbacAuthorization: true,
      accessPolicies: undefined,

      enablePurgeProtection: true,
      enableSoftDelete: true,
      softDeleteRetentionInDays: 7, //This is not important as pulumi auto restore and update the sift deleted.

      enabledForDeployment: true,
      enabledForDiskEncryption: true,

      networkAcls: network
        ? {
            bypass: "AzureServices",
            defaultAction: enums.keyvault.NetworkRuleAction.Deny,

            ipRules: network.ipAddresses
              ? network.ipAddresses.map((i) => ({ value: i }))
              : [],

            virtualNetworkRules: network.subnetIds
              ? network.subnetIds.map((s) => ({ id: s }))
              : undefined,
          }
        : {
            bypass: "AzureServices",
            defaultAction: enums.keyvault.NetworkRuleAction.Allow,
          },
    },

    tags: defaultTags,
  });

  //Grant RBAC permission
  grantVaultRbacPermission({
    name: `${name}-ReadOnlyGroup`,
    scope: resource.id,
    objectId: readOnlyGroup.objectId,
    permission: "ReadOnly",
    principalType: "Group",
  });

  grantVaultRbacPermission({
    name: `${name}-AdminGroup`,
    scope: resource.id,
    objectId: adminGroup.objectId,
    permission: "ReadWrite",
    principalType: "Group",
  });

  //Add current principal to the admin group
  addUserToGroup({
    name: `${name}-current-principal-as-admin`,
    objectId: currentPrincipal,
    groupObjectId: adminGroup.objectId,
  });

  //To Vault Info
  const toVaultInfo = () => ({ name: vaultName, group, id: resource.id });

  //Add Diagnostic
  const addDiagnostic = (logInfo: BasicMonitorArgs) =>
    createDiagnostic({
      name,
      targetResourceId: resource.id,
      ...logInfo,
      logsCategories: ["AuditEvent"],
    });

  // Create Private Link
  const createPrivateLink = (props: PrivateLinkProps) =>
    PrivateEndpoint({
      name: getPrivateEndpointName(name),
      group,
      ...props,
      resourceId: resource.id,
      privateDnsZoneName: "privatelink.vaultcore.azure.net",
      linkServiceGroupIds: ["keyVault"],
    });

  if (createDefaultValues) {
    const vaultInfo = toVaultInfo();

    addCustomSecret({
      name: "tenant-id",
      value: tenantId,
      vaultInfo,
      contentType: "KeyVault Default Values",
      dependsOn: resource,
    });

    addCustomSecret({
      name: "subscription-id",
      value: subscriptionId,
      vaultInfo,
      contentType: "KeyVault Default Values",
      dependsOn: resource,
    });
  }

  return {
    name: vaultName,
    vault: resource,
    readOnlyGroup,
    adminGroup,
    toVaultInfo,
    addDiagnostic,
    createPrivateLink,
  };
};
