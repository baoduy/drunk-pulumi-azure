import * as network from "@pulumi/azure-native/network";
import { Input, interpolate, Output } from "@pulumi/pulumi";
import * as netmask from "netmask";
import { currentRegionName, subscriptionId } from "../Common/AzureEnv";
import {
  getFirewallName,
  getIpAddressName,
  getResourceGroupName,
  getVnetName,
} from "../Common/Naming";
import { ResourceGroupInfo } from "../types";
import { enums, input as inputs } from "@pulumi/azure-native/types";
import {
  FirewallPolicyRuleCollectionResults,
  FirewallPolicyResults,
} from "./types";

export const appGatewaySubnetName = "app-gateway";
export const gatewaySubnetName = "GatewaySubnet";
export const azFirewallSubnet = "AzureFirewallSubnet";
export const azFirewallManagementSubnet = "AzureFirewallManagementSubnet";
export const azBastionSubnetName = "AzureBastionSubnet";

export const convertPolicyToGroup = ({
  policy,
  priority,
  action = enums.network.FirewallPolicyFilterRuleCollectionActionType.Allow,
}: {
  policy: FirewallPolicyResults;
  priority: number;
  action?: enums.network.FirewallPolicyFilterRuleCollectionActionType;
}): FirewallPolicyRuleCollectionResults => {
  const policyCollections = new Array<
    Input<
      | inputs.network.FirewallPolicyFilterRuleCollectionArgs
      | inputs.network.FirewallPolicyNatRuleCollectionArgs
    >
  >();

  // DNAT rules
  let pStart = priority + 1;
  if (policy.dnatRules && policy.dnatRules.length > 0) {
    policyCollections.push({
      name: `${policy.name}-dnat`,
      priority: pStart++,
      action: {
        type: enums.network.FirewallPolicyNatRuleCollectionActionType.DNAT,
      },
      ruleCollectionType: "FirewallPolicyNatRuleCollection",
      rules: policy.dnatRules,
    });
  }

  // Network rules
  if (policy.netRules && policy.netRules.length > 0) {
    policyCollections.push({
      name: `${policy.name}-net`,
      priority: pStart++,
      action: {
        type: action,
      },
      ruleCollectionType: "FirewallPolicyFilterRuleCollection",
      rules: policy.netRules,
    });
  }

  // Apps rules
  if (policy.appRules && policy.appRules.length > 0) {
    policyCollections.push({
      name: `${policy.name}-app`,
      priority: pStart++,
      action: {
        type: action,
      },
      ruleCollectionType: "FirewallPolicyFilterRuleCollection",
      rules: policy.appRules,
    });
  }

  return {
    name: `${policy.name}-grp`,
    priority,
    ruleCollections: policyCollections,
  };
};

export const getIpsRange = (prefix: string) => {
  //console.debug('getIpsRange', block);
  return new netmask.Netmask(prefix);
};

/** Convert IP address and IP address group into range */
export const convertToIpRange = (
  ipAddress: string[],
): Array<{ start: string; end: string }> =>
  ipAddress.map((ip) => {
    if (ip.includes("/")) {
      const range = getIpsRange(ip);
      return { start: range.base, end: range.broadcast };
    }
    return { start: ip, end: ip };
  });

export const getVnetIdFromSubnetId = (subnetId: string) => {
  //The sample SubnetId is /subscriptions/63a31b41-eb5d-4160-9fc9-d30fc00286c9/resourceGroups/sg-dev-aks-vnet/providers/Microsoft.Network/virtualNetworks/sg-vnet-trans/subnets/aks-main-nodes
  return subnetId.split("/subnets")[0];
};

interface SubnetProps {
  subnetName: string;
  //The Key name used to create resource group and Vnet
  vnetAndGroupName: string;
}

/**Get Subnet Id from Naming rules*/
export const getSubnetIdByName = ({
  subnetName,
  vnetAndGroupName,
}: SubnetProps): Output<string> => {
  const vnetName = getVnetName(vnetAndGroupName);
  const group = getResourceGroupName(vnetAndGroupName);
  return interpolate`/subscriptions/${subscriptionId}/resourceGroups/${group}/providers/Microsoft.Network/virtualNetworks/${vnetName}/subnets/${subnetName}`;
};

export const getIpAddressId = ({
  name,
  groupName,
}: {
  name: string;
  groupName: string;
}) => {
  const n = getIpAddressName(name);
  const group = getResourceGroupName(groupName);
  return interpolate`/subscriptions/${subscriptionId}/resourceGroups/${group}/providers/Microsoft.Network/publicIPAddresses/${n}`;
};

export const getIpAddressResource = ({
  name,
  groupName,
}: {
  name: string;
  groupName: string;
}) => {
  const n = getIpAddressName(name);
  const group = getResourceGroupName(groupName);

  return network.getPublicIPAddress({
    publicIpAddressName: n,
    resourceGroupName: group,
  });
};

export const getVnetInfo = (
  groupName: string,
): { vnetName: string; group: ResourceGroupInfo } => {
  const vnetName = getVnetName(groupName);
  const rsName = getResourceGroupName(groupName);

  return {
    vnetName,
    group: { resourceGroupName: rsName, location: currentRegionName },
  };
};

export const getFirewallIpAddress = (
  name: string,
  group: ResourceGroupInfo,
) => {
  const firewall = network.getAzureFirewallOutput({
    azureFirewallName: name,
    ...group,
  });

  return firewall.ipConfigurations!.apply((cf) => cf![0]!.privateIPAddress!);
};

export const getFirewallIpAddressByGroupName = (groupName: string) => {
  const fireWallName = getFirewallName(groupName);
  const rsName = getResourceGroupName(groupName);
  return getFirewallIpAddress(fireWallName, { resourceGroupName: rsName });
};
