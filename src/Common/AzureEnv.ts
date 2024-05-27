import * as pulumi from "@pulumi/pulumi";
import { authorization } from "@pulumi/azure-native";
import { registerAutoTags } from "./AutoTags";
import { KeyVaultInfo, ResourceGroupInfo } from "../types";
import { getKeyVaultName, getResourceGroupName } from "./Naming";
import { ResourceInfoArg } from "./ResourceEnv";
import { organization, projectName, stack } from "./StackEnv";
import { getCountryCode, getRegionCode } from "./Location";

const config = pulumi.output(authorization.getClientConfig());
export const tenantId = config.apply((c) => c.tenantId);
export const subscriptionId = config.apply((c) => c.subscriptionId);
export const currentPrincipal = config.apply((c) => c.objectId);

const env = JSON.parse(process.env.PULUMI_CONFIG ?? "{}");
export const currentRegionName = (env["azure-native:config:location"] ??
  "SoutheastAsia") as string;
export const currentRegionCode = getRegionCode(currentRegionName);
export const currentCountryCode = getCountryCode(currentRegionName);
export const defaultScope = pulumi.interpolate`/subscriptions/${subscriptionId}`;

export enum Environments {
  Global = "global",
  Local = "local",
  Dev = "dev",
  Sandbox = "sandbox",
  Prd = "prd",
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

/** ======== Default Variables ================*/
registerAutoTags({
  environment: stack,
  organization: organization,
  "pulumi-project": projectName,
});

/** Get Key Vault by Group Name. Group Name is the name use to create the resource and resource group together. */
export const getKeyVaultInfo = (groupName: string): KeyVaultInfo => {
  const vaultName = getKeyVaultName(groupName);
  const resourceGroupName = getResourceGroupName(groupName);

  return {
    name: vaultName,
    group: {
      resourceGroupName: resourceGroupName,
      location: currentRegionName,
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

  throw new Error("Resource Info is invalid.");
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

  const details = id.split("/");
  let name = "";
  let groupName = "";
  let subscriptionId = "";

  details.forEach((d, index) => {
    if (d === "subscriptions") subscriptionId = details[index + 1];
    if (d === "resourceGroups" || d === "resourcegroups")
      groupName = details[index + 1];
    if (index === details.length - 1) name = d;
  });

  return {
    name,
    id,
    group: { resourceGroupName: groupName, location: currentRegionName },
    subscriptionId,
  };
};
