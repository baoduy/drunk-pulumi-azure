import * as network from "@pulumi/azure-native/network";
import { input as inputs } from "@pulumi/azure-native/types";
import { interpolate, Output } from "@pulumi/pulumi";
import * as netmask from "netmask";

import { subscriptionId } from "../Common/AzureEnv";
import {
  getIpAddressName,
  getResourceGroupName,
  getVnetName,
} from "../Common/Naming";
import { FirewallRuleResults } from "./FirewallRules/types";

export const appGatewaySubnetName = "app-gateway";
export const gatewaySubnetName = "GatewaySubnet";
export const azFirewallSubnet = "AzureFirewallSubnet";
export const azFirewallManagementSubnet = "AzureFirewallManagementSubnet";
export const azBastionSubnetName = "AzureBastionSubnet";

export const getIpsRange = (prefix: string) => {
  const block = new netmask.Netmask(prefix);
  //console.debug('getIpsRange', block);
  return block;
};

/** Convert IP address and IP address group into range */
export const convertToIpRange = (
  ipAddress: string[]
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
  const id = subnetId.split("/subnets")[0];
  //console.log(id);
  return id;
};

/**Merge Firewall Rules Policies with starting priority*/
export const mergeFirewallRules = (
  rules: Array<FirewallRuleResults>,
  startPriority: number = 200
): FirewallRuleResults => {
  const applicationRuleCollections =
    new Array<inputs.network.AzureFirewallApplicationRuleCollectionArgs>();
  const natRuleCollections =
    new Array<inputs.network.AzureFirewallNatRuleCollectionArgs>();
  const networkRuleCollections =
    new Array<inputs.network.AzureFirewallNetworkRuleCollectionArgs>();

  //Combined Rules
  rules.forEach((r) => {
    if (r.applicationRuleCollections) {
      applicationRuleCollections.push(...r.applicationRuleCollections);
    }
    if (r.natRuleCollections) {
      natRuleCollections.push(...r.natRuleCollections);
    }
    if (r.networkRuleCollections) {
      networkRuleCollections.push(...r.networkRuleCollections);
    }
  });

  //Update Priority
  applicationRuleCollections.forEach(
    (a, i) => (a.priority = startPriority + i)
  );
  natRuleCollections.forEach((a, i) => (a.priority = startPriority + i));
  networkRuleCollections.forEach((a, i) => (a.priority = startPriority + i));

  return {
    applicationRuleCollections,
    natRuleCollections,
    networkRuleCollections,
  };
};

interface SubnetProps {
  subnetName: string;
  //The Key name used to create resource group and Vnet
  vnetKeyName: string;
}

/**Get Subnet Id from Naming rules*/
export const getSubnetIdByName = ({
  subnetName,
  vnetKeyName,
}: SubnetProps): Output<string> => {
  const vnetName = getVnetName(vnetKeyName);
  const group = getResourceGroupName(vnetKeyName);
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
