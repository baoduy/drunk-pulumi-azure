import * as network from '@pulumi/azure-native/network';
import { output } from '@pulumi/pulumi';
import * as netmask from 'netmask';
import dns from 'node:dns/promises';

import {
  getFirewallName,
  getIpAddressName,
  getResourceGroupName,
} from '../Common';
import { ResourceArgs } from '../types';

export const appGatewaySubnetName = 'app-gateway';
export const gatewaySubnetName = 'GatewaySubnet';
export const azFirewallSubnet = 'AzureFirewallSubnet';
export const azFirewallManagementSubnet = 'AzureFirewallManagementSubnet';
export const azBastionSubnetName = 'AzureBastionSubnet';

export const getIpsRange = (prefix: string) => new netmask.Netmask(prefix);

/** Convert IP address and IP address group into range */
export const convertToIpRange = (
  ipAddress: string[],
): Array<{ start: string; end: string }> =>
  ipAddress.map((ip) => {
    if (ip.includes('/')) {
      const range = getIpsRange(ip);
      return { start: range.base, end: range.broadcast };
    }
    return { start: ip, end: ip };
  });

interface SubnetProps {
  subnetName: string;
  //The Key name used to create resource group and Vnet
  vnetAndGroupName: string;
}

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

export const getFirewallIpAddress = ({ name, group }: ResourceArgs) => {
  const firewall = network.getAzureFirewallOutput({
    azureFirewallName: name,
    ...group,
  });

  return firewall.ipConfigurations!.apply((cf) => cf![0]!.privateIPAddress!);
};

export const getFirewallIpAddressByGroupName = (groupName: string) => {
  const fireWallName = getFirewallName(groupName);
  const rsName = getResourceGroupName(groupName);
  return getFirewallIpAddress({
    name: fireWallName,
    group: { resourceGroupName: rsName },
  });
};

export const getIpAddressFromHost = (host: string) =>
  output(dns.lookup(host, { family: 4 }));
