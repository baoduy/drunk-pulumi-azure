import {
  BasicMonitorArgs,
  ConventionProps,
  KeyVaultInfo,
  ResourceGroupInfo,
} from '../types';
import { Environments, subscriptionId } from './AzureEnv';
import { getResourceName } from './ResourceEnv';
import { getCdnProfileName } from './Naming';
import {
  globalConvention,
  defaultAlertEmails,
  organizationName,
  globalKeyName,
} from './config';
import { interpolate } from '@pulumi/pulumi';

export { globalConvention, defaultAlertEmails };

export const groupInfo: ResourceGroupInfo = {
  resourceGroupName: getResourceName(globalKeyName, globalConvention),
};

export const logGroupInfo: ResourceGroupInfo = {
  resourceGroupName: getResourceName('logs', globalConvention),
};

export const cdnProfileInfo = {
  profileName: `${globalKeyName}-${organizationName}-cdn-pfl`,
  ...groupInfo,
};

/** Global Key Vault Info */
export const keyVaultInfo: KeyVaultInfo = {
  name: `${globalKeyName}-${organizationName.toLowerCase()}-vlt`,
  group: groupInfo,
  id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${groupInfo.resourceGroupName}/providers/Microsoft.KeyVault/vaults/${globalKeyName}-${organizationName}-vlt`,
};

/** Log will send to either storage or log workspace. Only a few important resources will use workspace like Firewall, Aks */
export const logWpInfo: BasicMonitorArgs = {
  logWpId: interpolate`/subscriptions/${subscriptionId}/resourcegroups/${logGroupInfo.resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${globalKeyName}-${organizationName}-logs-log`,
};

export const logStorageInfo: BasicMonitorArgs = {
  logStorageId: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${logGroupInfo.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${globalKeyName}${organizationName}logsstg`,
};
