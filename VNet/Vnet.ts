import * as network from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';
import { input as inputs, enums } from '@pulumi/azure-native/types';
import { BasicResourceArgs, ResourceGroupInfo } from '../types';
import { defaultTags } from '../Common/AzureEnv';
import {
  appGatewaySubnetName,
  azBastionSubnetName,
  azFirewallSubnet,
  gatewaySubnetName,
} from './Helper';
import { getVnetName } from '../Common/Naming';
import Bastion from './Bastion';

const defaultServicesEndpoints = [
  'Microsoft.AzureActiveDirectory',
  'Microsoft.AzureCosmosDB',
  'Microsoft.ContainerRegistry',
  'Microsoft.EventHub',
  'Microsoft.KeyVault',
  'Microsoft.ServiceBus',
  'Microsoft.Sql',
  'Microsoft.Storage',
  'Microsoft.Web',
];

export type DelegateServices =
  | 'Microsoft.ContainerInstance/containerGroups'
  | 'Microsoft.Web/serverFarms';

export interface SubnetProps {
  name: string;
  /** The index of prefixSpaces*/
  addressPrefix: string;
  /** Enable this to allow to link private endpoint network policies */
  enablePrivateEndpoint?: boolean;
  /** Enable this to allow to link private link service network policies*/
  enablePrivateLinkService?: boolean;
  enableSecurityGroup?: boolean;
  enableRouteTable?: boolean;
  allowedServiceEndpoints?: boolean | string[];
  delegateServices?: DelegateServices[];
}

interface Props {
  subnet: SubnetProps;
  vnetName: pulumi.Input<string>;
  group: ResourceGroupInfo;
  securityGroupId?: pulumi.Output<string>;
  routeTableId?: pulumi.Output<string>;
}

const createSubnet = ({
  group,
  subnet,
  vnetName,
  routeTableId,
  securityGroupId,
}: Props) => {
  const serviceEndpoints = Array.isArray(subnet.allowedServiceEndpoints)
    ? subnet.allowedServiceEndpoints
    : subnet.allowedServiceEndpoints === true
      ? defaultServicesEndpoints
      : undefined;

  return {
    name: subnet.name,
    subnetName: subnet.name,
    ...group,
    addressPrefix: subnet.addressPrefix,
    virtualNetworkName: vnetName,

    routeTable:
      subnet.enableRouteTable !== false && routeTableId
        ? { id: routeTableId }
        : undefined,
    networkSecurityGroup: securityGroupId ? { id: securityGroupId } : undefined,

    privateLinkServiceNetworkPolicies: subnet.enablePrivateLinkService
      ? network.VirtualNetworkPrivateLinkServiceNetworkPolicies.Enabled
      : network.VirtualNetworkPrivateLinkServiceNetworkPolicies.Disabled,

    privateEndpointNetworkPolicies: subnet.enablePrivateEndpoint
      ? network.VirtualNetworkPrivateEndpointNetworkPolicies.Enabled
      : network.VirtualNetworkPrivateEndpointNetworkPolicies.Disabled,

    serviceEndpoints: serviceEndpoints
      ? serviceEndpoints.map((service) => ({ service }))
      : undefined,

    delegations: subnet.delegateServices
      ? subnet.delegateServices.map((d) => ({
        name: `${subnet.name}-${d.split('/').pop()}-delegate`,
        serviceName: d,
      }))
      : undefined,
  };
};

interface VnetProps extends BasicResourceArgs {
  ddosId?: pulumi.Input<string>;
  /** the prefix space of vnet: ex [192.168.0.0/16]. If not provided it will collect from subnet */
  addressSpaces?: Array<pulumi.Input<string>>;
  subnets?: SubnetProps[];
  dnsServers?: pulumi.Input<pulumi.Input<string>[]>;

  /** The list of IP address that will allow public internet to go in*/
  //publicIpAddress?: pulumi.Output<string | undefined>;

  features?: {
    securityGroup?: {
      /**Add Security rule to block internet if it is TRUE*/
      allowInternetAccess?: boolean;
      rules?: pulumi.Input<inputs.network.SecurityRuleArgs>[];
    };

    routeTable?: { rules?: pulumi.Input<inputs.network.RouteArgs>[] };

    appGatewaySubnet?: {
      addressPrefix: string;
      version: 'v1' | 'v2';
    };

    firewall?: {
      /** Subnet address Prefix */
      addressPrefix: string;
    };
    //Enable Bastion host for Remove desktop via a web browser without open RDP port.
    bastion?: {
      /** Subnet address Prefix */
      addressPrefix: string;
      /** In case just want to create subnet only without bastion host */
      donotCreateBastionHost?: boolean
    };
  };
}

export default ({
  name,
  group,
  ddosId,
  addressSpaces,
  subnets = [],
  dnsServers,
  //publicIpAddress,
  features = {},
}: VnetProps) => {
  const vName = getVnetName(name);
  const securityRules =
    features.securityGroup?.rules ||
    new Array<pulumi.Input<inputs.network.SecurityRuleArgs>>();

  //AppGateway
  if (features.appGatewaySubnet) {
    subnets.push({
      name: appGatewaySubnetName,
      addressPrefix: features.appGatewaySubnet.addressPrefix,
      allowedServiceEndpoints: false,
    });
    //Add Security Rules for App Gateway
    securityRules.push(...getAppGatewayRules(features.appGatewaySubnet));
  }
  //Bastion Host
  if (features.bastion) {
    subnets.push({
      name: azBastionSubnetName,
      addressPrefix: features.bastion.addressPrefix,
      allowedServiceEndpoints: false,
    });

    //Only Allows Https with port 443 from public IP address to Bastion Host Ips
    securityRules.push({
      name: 'allow-internet-bastion',
      sourceAddressPrefix: '*',
      sourcePortRange: '*',
      destinationAddressPrefix: features.bastion.addressPrefix,
      destinationPortRange: '443',
      protocol: 'TCP',
      access: 'Allow',
      direction: 'Inbound',
      priority: 200 + securityRules.length + 1,
    });
  }

  //Firewall Subnet
  if (features.firewall) {
    subnets.push({
      name: azFirewallSubnet,
      addressPrefix: features.firewall.addressPrefix,
      allowedServiceEndpoints: false,
    });
  }

  //NetworkSecurityGroup
  let securityGroup: network.NetworkSecurityGroup | undefined = undefined;
  if (features.securityGroup) {
    if (!features.securityGroup.allowInternetAccess) {
      securityRules.push({
        name: 'deny-internet',
        sourceAddressPrefix: '*',
        sourcePortRange: '*',
        destinationAddressPrefix: 'Internet',
        destinationPortRange: '*',
        protocol: '*',
        access: 'Deny',
        direction: 'Outbound',
        priority: 4096, //The last rule in the list});
      });
    }

    securityGroup = new network.NetworkSecurityGroup(`${vName}-sg`, {
      networkSecurityGroupName: `${vName}-sg`,
      ...group,
      securityRules,
    });
  }

  //Route Table
  const routeTable = new network.RouteTable(`${vName}-route`, {
    routeTableName: `${vName}-route`,
    ...group,
    routes: features.routeTable?.rules || [],
  });

  //Create VNet
  const vnet = new network.VirtualNetwork(vName, {
    virtualNetworkName: vName,
    addressSpace: {
      addressPrefixes: addressSpaces || subnets.map((s) => s.addressPrefix),
    },
    ...group,
    enableVmProtection: true,
    dhcpOptions: dnsServers ? { dnsServers } : undefined,

    subnets: subnets.map((s) =>
      createSubnet({
        subnet: s,
        vnetName: name,
        group,

        securityGroupId:
          s.enableSecurityGroup === false ||
            [azFirewallSubnet, azBastionSubnetName, gatewaySubnetName].includes(
              s.name
            )
            ? undefined
            : securityGroup?.id,

        routeTableId: [
          azBastionSubnetName,
          azFirewallSubnet,
          gatewaySubnetName,
        ].includes(s.name)
          ? undefined
          : routeTable.id,
      })
    ),

    enableDdosProtection: ddosId !== undefined,
    ddosProtectionPlan: ddosId ? { id: ddosId } : undefined,

    tags: defaultTags,
  });

  const findSubnet = (name: string) =>
    vnet.subnets.apply((ss) => ss!.find((s) => s.name === name));

  const bastionSubnet = findSubnet(azBastionSubnetName);
  //Create Bastion
  if (features.bastion && !features.bastion.donotCreateBastionHost) {
    Bastion({
      name,
      group,
      subnetId: bastionSubnet!.apply((s) => s!.id!),
      dependsOn: [vnet],
    });
  }

  //Return the results
  return {
    vnet,

    firewallSubnet: findSubnet(azFirewallSubnet),
    appGatewaySubnet: findSubnet(appGatewaySubnetName),
    bastionSubnet,

    findSubnet,
    securityGroup,
    routeTable,
  };
};

const getAppGatewayRules = ({
  addressPrefix,
  version,
}: {
  addressPrefix: string;
  version: 'v1' | 'v2';
}): pulumi.Input<inputs.network.SecurityRuleArgs>[] => {
  let start = 100;

  return [
    //Add inbound rule for app gateway subnet
    {
      name: 'allow_internet_in_gateway_health',
      description: 'Allow Health check access from internet to Gateway',
      priority: 200 + start++,
      protocol: 'Tcp',
      access: 'Allow',
      direction: 'Inbound',

      sourceAddressPrefix: 'Internet',
      sourcePortRange: '*',
      destinationAddressPrefix: addressPrefix,
      destinationPortRanges:
        version === 'v1' ? ['65503-65534'] : ['65200-65535'],
    },

    {
      name: 'allow_https_internet_in_gateway',
      description: 'Allow HTTPS access from internet to Gateway',
      priority: 200 + start++,
      protocol: 'Tcp',
      access: 'Allow',
      direction: 'Inbound',

      sourceAddressPrefix: 'Internet',
      sourcePortRange: '*',
      destinationAddressPrefix: addressPrefix,
      destinationPortRange: '443',
    },

    {
      name: 'allow_loadbalancer_in_gateway',
      description: 'Allow Load balancer to Gateway',
      priority: 200 + start++,
      protocol: 'Tcp',
      access: 'Allow',
      direction: 'Inbound',

      sourceAddressPrefix: 'AzureLoadBalancer',
      sourcePortRange: '*',
      destinationAddressPrefix: addressPrefix,
      destinationPortRange: '*',
    },

    //Denied others
    // {
    //   name: 'denied_others_in_gateway',
    //   description: 'Denied others to Gateway',
    //   priority: 3000 + start++,
    //   protocol: 'Tcp',
    //   access: 'Deny',
    //   direction: 'Inbound',

    //   sourceAddressPrefix: '*',
    //   sourcePortRange: '*',
    //   destinationAddressPrefix: addressPrefix,
    //   destinationPortRange: '*',
    // },
  ];
};
