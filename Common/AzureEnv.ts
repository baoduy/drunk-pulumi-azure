import { all, interpolate } from '@pulumi/pulumi';
import { registerAutoTags } from 'drunk-pulumi/Common/AutoTags';
import { KeyVaultInfo, ResourceGroupInfo } from '../types';
import { getKeyVaultName, getResourceGroupName } from './Naming';
import { ResourceInfoArg } from './ResourceEnv';
import { organization, projectName, stack } from './StackEnv';

const config = JSON.parse(process.env.PULUMI_CONFIG ?? '{}');
export const tenantId = config['azure-native:config:tenantId'] as string;
export const subscriptionId = config[
  'azure-native:config:subscriptionId'
] as string;
//export const currentServicePrincipal = config.objectId;
export const currentLocation = config['azure-native:config:location'] as string;
export const defaultScope = interpolate`/subscriptions/${subscriptionId}`;

//Print and Check
all([subscriptionId, tenantId]).apply(([s, t]) => {
  console.log(`Current Azure:`, { TenantId: t, SubscriptionId: s });
});

/** ======== Default Variables ================*/

export const defaultTags = {
  environment: stack,
  organization: organization,
  'pulumi-project': projectName,
};

registerAutoTags(defaultTags);

export enum Environments {
  Global = 'global',
  Local = 'local',
  Dev = 'dev',
  Sandbox = 'sandbox',
  Prd = 'prd',
}

export const isEnv = (env: Environments) => stack.includes(env);
export const isDev = isEnv(Environments.Dev);
export const isSandbox = isEnv(Environments.Sandbox);
export const isPrd = isEnv(Environments.Prd);
export const isGlobal = isEnv(Environments.Global);
export const isLocal = isEnv(Environments.Local);

const getCurrentEnv = () => {
  if (isGlobal) return Environments.Global;
  if (isPrd) return Environments.Prd;
  if (isSandbox) return Environments.Sandbox;

  if (isDev) return Environments.Dev;

  return Environments.Local;
};

export const currentEnv = getCurrentEnv();

/** Get Key Vault by Group Name. Group Name is the name use to create the resource and resource group together. */
export const getKeyVaultInfo = (groupName: string): KeyVaultInfo => {
  const vaultName = getKeyVaultName(groupName);
  const resourceGroupName = getResourceGroupName(groupName);

  return {
    name: vaultName,
    group: { resourceGroupName: resourceGroupName, location: currentLocation },
    id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${vaultName}`,
  };
};

export const getResourceIdFromInfo = ({
  group,
  name,
  provider,
}: ResourceInfoArg) => {
  if (!name && !provider)
    return interpolate`/subscriptions/${subscriptionId}/resourceGroups/${group.resourceGroupName}`;
  else if (name && provider)
    return interpolate`/subscriptions/${subscriptionId}/resourceGroups/${group.resourceGroupName}/providers/${provider}/${name}`;

  throw new Error('Resource Info is invalid.');
};

/**Get Resource Info from Resource ID. Sample ID is "/subscriptions/01af663e-76dd-45ac-9e57-9c8e0d3ee350/resourceGroups/sandbox-codehbd-group-hbd/providers/Microsoft.Network/virtualNetworks/sandbox-codehbd-vnet-hbd"*/
export interface ResourceInfo {
  name: string;
  group: ResourceGroupInfo;
  subscriptionId: string;
  id: string;
}

export const getResourceInfoFromId = (id: string): ResourceInfo | undefined => {
  if (!id) return undefined;

  const details = id.split('/');
  let name = '';
  let groupName = '';
  let subscriptionId = '';

  details.forEach((d, index) => {
    if (d === 'subscriptions') subscriptionId = details[index + 1];
    if (d === 'resourceGroups' || d === 'resourcegroups')
      groupName = details[index + 1];
    if (index === details.length - 1) name = d;
  });

  return {
    name,
    id,
    group: { resourceGroupName: groupName, location: currentLocation },
    subscriptionId,
  };
};
