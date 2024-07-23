import * as pulumi from '@pulumi/pulumi';
import { authorization } from '@pulumi/azure-native';
import { registerAutoTags } from './AutoTags';
import { KeyVaultInfo, ResourceInfo, ResourceInfoArg } from '../types';
import { getKeyVaultName, getResourceGroupName } from './Naming';
import { organization, projectName, stack } from './StackEnv';
import { getCountryCode, getRegionCode } from './Location';

const config = pulumi.output(authorization.getClientConfig());
export const tenantId = config.apply((c) => c.tenantId);
export const subscriptionId = config.apply((c) => c.subscriptionId);
export const currentPrincipal = config.apply((c) => c.objectId);

const env = JSON.parse(process.env.PULUMI_CONFIG ?? '{}');
export const currentRegionName = (env['azure-native:config:location'] ??
  'SoutheastAsia') as string;
export const currentRegionCode = getRegionCode(currentRegionName);
export const currentCountryCode = getCountryCode(currentRegionName);
export const defaultSubScope = pulumi.interpolate`/subscriptions/${subscriptionId}`;

export enum Environments {
  Global = 'global',
  Dev = 'dev',
  Sandbox = 'sandbox',
  Prd = 'prd',
}

export const isEnv = (env: Environments) => stack.includes(env);
export const isDev = isEnv(Environments.Dev);
export const isSandbox = isEnv(Environments.Sandbox);
export const isPrd = isEnv(Environments.Prd);
export const isGlobal = isEnv(Environments.Global);

const getCurrentEnv = () => {
  if (isGlobal) return Environments.Global;
  if (isPrd) return Environments.Prd;
  if (isSandbox) return Environments.Sandbox;
  return Environments.Dev;
};

export const currentEnv = getCurrentEnv();

//Print and Check
pulumi.all([subscriptionId, tenantId]).apply(([s, t]) => {
  console.log(`Azure Environment:`, {
    tenantId: t,
    subscriptionId: s,
    currentRegionCode,
    currentRegionName,
    currentCountryCode,
    currentEnv,
  });
});

export const allAzurePorts = [
  '22',
  '443',
  '445',
  '1433',
  '1194',
  '3306',
  '3389',
  '5432',
  '5671',
  '5672',
  '6379',
  '6380',
  '8883',
  '9000',
  '10255',
];
/** ======== Default Variables ================*/
registerAutoTags({
  environment: stack,
  organization: organization,
  'pulumi-project': projectName,
});

/** Get Key Vault by Group Name. Group Name is the name use to create the resource and resource group together. */
export const getKeyVaultInfo = (
  groupName: string,
  region: string = currentCountryCode,
): KeyVaultInfo => {
  const vaultName = getKeyVaultName(groupName, {
    region,
    suffix: 'vlt',
    includeOrgName: true,
  });
  const resourceGroupName = getResourceGroupName(groupName, { region });

  return {
    name: vaultName,
    group: {
      resourceGroupName: resourceGroupName,
      location: region === currentCountryCode ? currentRegionName : undefined,
    },
    id: pulumi.interpolate`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${vaultName}`,
  };
};

export const getResourceIdFromInfo = ({
  group,
  name,
  provider,
}: ResourceInfoArg) => {
  if (!name && !provider)
    return pulumi.interpolate`/subscriptions/${subscriptionId}/resourceGroups/${group.resourceGroupName}`;
  else if (name && provider)
    return pulumi.interpolate`/subscriptions/${subscriptionId}/resourceGroups/${group.resourceGroupName}/providers/${provider}/${name}`;

  throw new Error('Resource Info is invalid.');
};

export type ParsedResourceInfo = ResourceInfo & {
  subscriptionId: pulumi.Input<string>;
};
export const parseResourceInfoFromId = (
  id: string,
): ParsedResourceInfo | undefined => {
  if (!id) return undefined;

  const details = id.split('/');
  let name = '';
  let groupName = '';
  let subId = '';

  details.forEach((d, index) => {
    if (d === 'subscriptions') subId = details[index + 1];
    if (d === 'resourceGroups' || d === 'resourcegroups')
      groupName = details[index + 1];
    if (index === details.length - 1) name = d;
  });

  return {
    name,
    id: pulumi.output(id),
    group: { resourceGroupName: groupName, location: currentRegionName },
    subscriptionId: subId ?? subscriptionId,
  };
};
