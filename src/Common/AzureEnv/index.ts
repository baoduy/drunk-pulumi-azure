import * as pulumi from '@pulumi/pulumi';
import { authorization } from '@pulumi/azure-native';
import { registerAutoTags } from './AutoTags';
import { organization, projectName, stack } from '../StackEnv';
import { getCountryCode, getRegionCode } from '../Location';
import { Environments } from '../../types';

const azEnv = JSON.parse(process.env.PULUMI_CONFIG ?? '{}');
const config = authorization.getClientConfigOutput();

export const tenantId =
  azEnv['azure-native:config:tenantId'] ?? config.tenantId;
export const subscriptionId =
  azEnv['azure-native:config:subscriptionId'] ?? config.subscriptionId;
export const currentPrincipal = config.objectId;
export const currentRegionName = (azEnv['azure-native:config:location'] ??
  'SoutheastAsia') as string;
export const currentRegionCode = getRegionCode(currentRegionName);
export const currentCountryCode = getCountryCode(currentRegionName);
export const defaultSubScope = pulumi.interpolate`/subscriptions/${subscriptionId}`;

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
