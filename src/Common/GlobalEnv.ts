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
