import { output } from '@pulumi/pulumi';
import * as netmask from 'netmask';
import dns from 'node:dns/promises';

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

export const getIpAddressFromHost = (host: string) =>
  output(dns.lookup(host, { family: 4 }));
