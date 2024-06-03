import { ConventionProps, KeyVaultInfo, ResourceGroupInfo } from "../types";
import { subscriptionId } from "./AzureEnv";
import { getResourceName } from "./ResourceEnv";
import { interpolate } from "@pulumi/pulumi";
import { organization } from "./StackEnv";

export const globalKeyName = "global";

/**The Global resource group name.*/
export const globalConvention: ConventionProps = {
  prefix: globalKeyName,
  suffix: organization ? `grp-${organization}` : "grp",
};

export const groupInfo: ResourceGroupInfo = {
  resourceGroupName: getResourceName(globalKeyName, globalConvention),
};

// export const logGroupInfo: ResourceGroupInfo = {
//   resourceGroupName: getResourceName('logs', globalConvention),
// };

export const cdnProfileInfo = {
  profileName: `${globalKeyName}-${organization}-cdn-pfl`,
  ...groupInfo,
};

/** Global Key Vault Info */
export const keyVaultInfo: KeyVaultInfo = {
  name: `${globalKeyName}-${organization}-vlt`,
  group: groupInfo,
  id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${groupInfo.resourceGroupName}/providers/Microsoft.KeyVault/vaults/${globalKeyName}-${organization}-vlt`,
};

/** Log will send to either storage or log workspace. Only a few important resources will use workspace like Firewall, Aks */
// export const logWpInfo: BasicMonitorArgs = {
//   logWpId: interpolate`/subscriptions/${subscriptionId}/resourcegroups/${logGroupInfo.resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${globalKeyName}-${organization}-logs-log`,
// };
//
// export const logStorageInfo: BasicMonitorArgs = {
//   logStorageId: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${logGroupInfo.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${globalKeyName}${organization}logsstg`,
// };
