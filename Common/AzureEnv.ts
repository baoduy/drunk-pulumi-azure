import * as native from '@pulumi/azure-native';
import { projectName, stack, testMode } from './StackEnv';
import { organizationName } from './config';
import { all, output, interpolate } from '@pulumi/pulumi';
import { KeyVaultInfo } from '../types';
import { getKeyVaultName, getResourceGroupName } from './Naming';
import { ResourceInfoArg } from './ResourceEnv';

const config = output(native.authorization.getClientConfig());

export const tenantId = config.tenantId;
export const subscriptionId = config.subscriptionId;
export const currentServicePrincipal = config.objectId;
export const defaultLocation = 'SoutheastAsia';
export const defaultScope = subscriptionId.apply((s) => `/subscriptions/${s}`);

//Print and Check
all([subscriptionId, tenantId]).apply(([s, t]) => {
  console.log(`Current Azure:`, { TenantId: t, SubscriptionId: s });
});

/** ======== Default Variables ================*/
export const lockResourceGroup = true;

export const defaultTags = {
  environment: stack,
  organization: organizationName,
  'pulumi-project': projectName,
};

/** Enable Rbac or using Access policy for Key Vault*/
export const vaultEnableRbac = true;

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
/** Protect Private API that only allows accessing from APIM */
export const apimEnabled = isPrd;

const getCurrentEnv = () => {
  if (isPrd) return Environments.Prd;
  if (isSandbox) return Environments.Sandbox;
  if (isDev) return Environments.Dev;

  if (testMode) return Environments.Dev;
  return Environments.Global;
};

export const currentEnv = getCurrentEnv();

export const getAlertActionGroupInfo = (
  env: Environments
):
  | {
      name: string;
      resourceGroupName: string;
    }
  | undefined => {
  //TODO: Define the alert action group name
  return undefined;
};

/** Get Key Vault by Group Name. Group Name is the name use to create the resource and resource group together. */
export const getKeyVaultInfo = (groupName: string): KeyVaultInfo => {
  const vaultName = getKeyVaultName(groupName);
  const resourceGroupName = getResourceGroupName(groupName);

  return {
    name: vaultName,
    group: { resourceGroupName: resourceGroupName },
    id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${vaultName}`,
  };
};

export const envDomain = 'drunkcoding.net';

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
