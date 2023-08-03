import * as network from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';
import { input as inputs } from '@pulumi/azure-native/types';
import { output as outputs } from '@pulumi/azure-native/types';
import { BasicResourceArgs } from '../types';
import { defaultTags } from '../Common/AzureEnv';
import {
  appGatewaySubnetName,
  azBastionSubnetName,
  azFirewallManagementSubnet,
  azFirewallSubnet,
  gatewaySubnetName,
} from './Helper';
import { getVnetName } from '../Common/Naming';
import Bastion from './Bastion';
import CreateSubnet, { SubnetProps } from './Subnet';
import { Lifted, OutputInstance } from '@pulumi/pulumi';
import { PublicIPAddress } from '@pulumi/azure-native/network';

export type DelegateServices =
  | 'Microsoft.ContainerInstance/containerGroups'
  | 'Microsoft.Web/serverFarms';

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
      /**Add Security rule to block/allow inbound internet if it is TRUE*/
      //allowInboundInternetAccess?: boolean;
      /**Add Security rule to block/allow internet if it is TRUE*/
      allowOutboundInternetAccess?: boolean;
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
      managementAddressPrefix?: string;
    };
    //Enable Bastion host for Remove desktop via a web browser without open RDP port.
    bastion?: {
      /** Subnet address Prefix */
      addressPrefix: string;
      /** In case just want to create subnet only without bastion host */
      disableBastionHostCreation?: boolean;
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

    securityRules.push({
      name: 'allow-internet-bastion',
      sourceAddressPrefix: '*',
      sourcePortRange: '*',
      destinationAddressPrefix: features.bastion.addressPrefix,
      destinationPortRange: '443',
      protocol: 'TCP',
      access: 'Allow',
      direction: 'Inbound',
      priority: 3000,
    });
  }

  //Firewall Subnet
  if (features.firewall) {
    subnets.push({
      name: azFirewallSubnet,
      addressPrefix: features.firewall.addressPrefix,
      allowedServiceEndpoints: false,
    });

    if (features.firewall.managementAddressPrefix)
      subnets.push({
        name: azFirewallManagementSubnet,
        addressPrefix: features.firewall.managementAddressPrefix,
        allowedServiceEndpoints: false,
      });
  }

  //NetworkSecurityGroup
  let securityGroup: network.NetworkSecurityGroup | undefined = undefined;
  if (features.securityGroup) {
    //Allow outbound internet
    if (!features.securityGroup.allowOutboundInternetAccess) {
      securityRules.push({
        name: 'deny-internet',
        sourceAddressPrefix: '*',
        sourcePortRange: '*',
        destinationAddressPrefix: 'Internet',
        destinationPortRange: '*',
        protocol: '*',
        access: 'Deny',
        direction: 'Outbound',
        priority: 4096, //The last rule in the list;
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
      CreateSubnet({
        subnet: s,
        vnetName: name,
        group,

        securityGroup:
          s.enableSecurityGroup === false ||
          [azFirewallSubnet, azBastionSubnetName, gatewaySubnetName].includes(
            s.name
          )
            ? undefined
            : securityGroup,

        routeTable: [
          azBastionSubnetName,
          azFirewallSubnet,
          gatewaySubnetName,
        ].includes(s.name)
          ? undefined
          : routeTable,
      })
    ),

    enableDdosProtection: ddosId !== undefined,
    ddosProtectionPlan: ddosId ? { id: ddosId } : undefined,

    tags: defaultTags,
  });

  const subnetResults: Record<
    string,
    OutputInstance<outputs.network.SubnetResponse> &
      Lifted<outputs.network.SubnetResponse>
  > = {};

  const findSubnet = (name: string) =>
    vnet.subnets.apply((ss) => ss!.find((s) => s.name === name));

  subnets?.forEach((s) => {
    subnetResults[s.name] = findSubnet(s.name).apply((s) => s!);
  });

  const bastionSubnet = subnetResults[azBastionSubnetName];

  //Create Bastion
  if (features.bastion && !features.bastion.disableBastionHostCreation) {
    Bastion({
      name,
      group,
      subnetId: bastionSubnet.apply((s) => s.id!),
      dependsOn: [vnet],
    });
  }

  //Return the results
  return {
    vnet,

    firewallSubnet: subnetResults[azFirewallSubnet],
    firewallManageSubnet: subnetResults[azFirewallManagementSubnet],
    appGatewaySubnet: subnetResults[appGatewaySubnetName],

    bastionSubnet,
    subnets: subnetResults,

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
