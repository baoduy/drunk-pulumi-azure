import * as native from "@pulumi/azure-native";
import { enums } from "@pulumi/azure-native/types";
import { Input, output } from "@pulumi/pulumi";
import { subscriptionId, tenantId } from "../Common/AzureEnv";
import { getKeyVaultName, getPrivateEndpointName } from "../Common/Naming";
import { createDiagnostic } from "../Logs/Helpers";
import { BasicMonitorArgs, PrivateLinkProps } from "../types";
import PrivateEndpoint from "../VNet/PrivateEndpoint";
import { BasicResourceArgs } from "../types";
import { addCustomSecret } from "./CustomHelper";
import { grantVaultPermissionToRole } from "./VaultPermissions";
import { createVaultRoles } from "../AzAd/KeyVaultRoles";

interface Props extends BasicResourceArgs {
  /**The default-encryption-key, tenant-id va subscription-id will be added to the secrets and keys*/
  createDefaultValues?: boolean;
  network?: {
    ipAddresses?: Array<Input<string>>;
    subnetIds?: Array<Input<string>>;
  };
}

export default ({
  name,
  //nameConvention,
  group,
  createDefaultValues,
  network,
  ...others
}: Props) => {
  const vaultName = getKeyVaultName(name);
  const roles = createVaultRoles(name);

  const vault = new native.keyvault.Vault(vaultName, {
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
  });

  //To Vault Info
  const toVaultInfo = () => ({
    name: vaultName,
    group,
    id: vault.id,
  });
  const vaultInfo = toVaultInfo();

  grantVaultPermissionToRole({ name, vaultInfo, roles });

  if (createDefaultValues) {
    addCustomSecret({
      name: "tenant-id",
      value: tenantId,
      vaultInfo,
      contentType: "KeyVault Default Values",
      dependsOn: vault,
    });

    addCustomSecret({
      name: "subscription-id",
      value: subscriptionId,
      vaultInfo,
      contentType: "KeyVault Default Values",
      dependsOn: vault,
    });
  }

  //Add Diagnostic
  const addDiagnostic = (logInfo: BasicMonitorArgs) =>
    createDiagnostic({
      name,
      targetResourceId: vault.id,
      ...logInfo,
      logsCategories: ["AuditEvent"],
    });

  // Create Private Link
  const createPrivateLink = (props: PrivateLinkProps) =>
    PrivateEndpoint({
      name: getPrivateEndpointName(name),
      group,
      ...props,
      resourceId: vault.id,
      privateDnsZoneName: "privatelink.vaultcore.azure.net",
      linkServiceGroupIds: ["keyVault"],
    });

  return {
    name: vaultName,
    vault,
    toVaultInfo,
    addDiagnostic,
    createPrivateLink,
  };
};
