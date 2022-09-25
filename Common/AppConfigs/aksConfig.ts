//Vnet Peering
import { isPrd } from '../AzureEnv';
import { organizationName } from '../config';

export const aksGroupName = 'aks';
export const aksClusterName = organizationName;
export const privateCluster = false;
export const enableVirtualNode = false;
export const enableFirewall = false;
export const enableCertManager = true;
//Vnet Peering
export const peeringFirewallIpAddress = undefined;
export const peeringVnetId: string | undefined = undefined;

// Only enabled Dedicated Firewall if no peering Vnet is provided.
// 172.17.0.1/16 is docker bridge and AKS clusters may not use 169.254.0.0/16, 172.30.0.0/16, 172.31.0.0/16, or 192.0.2.0/24 for the Kubernetes service address range, pod address range or cluster virtual network address range.
//- PRD:     192.168.0.1 - 192.168.7.254
//- SANDBOX: 192.167.0.1 - 192.167.7.254
export const envSpace = isPrd ? '192.168.0' : '192.167.0';
//There are 2048 IpAddress for each Environment.
export const vnetAddressSpace = [`${envSpace}.0/21`];
//There are 254 address for AKS cluster
// Used: 172.xx.1.1 - 172.xx.1.254
export const aksSpace = `${envSpace.replace('.0', '.1')}.0/24`;
export const aksVirtualNodeSpace = `${envSpace.replace('.0', '.2')}.0/24`;

//There are 126 for Firewall (it needs at least 64 Ip addresses).
// Used: 172.xx.0.1 - 172.xx.0.126
export const firewallSpace = `${envSpace}.0/25`;
//This will be use for all Private Links
//Used: 172.xx.0.129 - 172.xx.0.158
export const privateSpace = `${envSpace}.128/27`;

//These IP address must be under aksSpace
export const internalAppIp = `${envSpace.replace('.0', '.1')}.250`; //<== all external requests will be DNAT to this IP Address
export const internalApiIp = `${envSpace.replace('.0', '.1')}.251`; //<== all API management requests will be DNAT to this IP Address

export const defaultAksAdmins = [
  { name: 'Steven', objectId: '2f65f90a-991c-4f8f-95b3-86e8352240fd' },
  { name: 'Steven 2', objectId: '188d4296-025a-4042-88f1-c530057efc2d' },
];
