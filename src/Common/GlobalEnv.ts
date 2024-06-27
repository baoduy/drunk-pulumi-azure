import {
  ConventionProps,
  KeyVaultInfo,
  ResourceGroupInfo,
  ResourceInfo,
} from "../types";
import { subscriptionId } from "./AzureEnv";
import { getCdnProfileName, getKeyVaultName } from "./Naming";
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

const cdnProfileName = getCdnProfileName(globalKeyName);
export const cdnProfileInfo: ResourceInfo = {
  resourceName: cdnProfileName,
  group: {
    resourceGroupName: groupInfo.resourceGroupName,
    location: globalKeyName,
  },
  id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${groupInfo.resourceGroupName}/providers/microsoft.cdn/profiles/${cdnProfileName}`,
};

/** Global Key Vault Info */
const vaultName = getKeyVaultName(globalKeyName);
export const keyVaultInfo: KeyVaultInfo = {
  name: vaultName,
  group: groupInfo,
  id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${groupInfo.resourceGroupName}/providers/Microsoft.KeyVault/vaults/${vaultName}`,
};
