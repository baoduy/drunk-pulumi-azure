import * as network from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';
import { output as outputs } from '@pulumi/azure-native/types';
import { BasicResourceArgs, ResourceInfo } from '../types';
import { CustomSecurityRuleArgs, RouteArgs } from './types';
import {
  appGatewaySubnetName,
  azBastionSubnetName,
  azFirewallManagementSubnet,
  azFirewallSubnet,
  gatewaySubnetName,
} from './Helper';
import { getVnetName } from '../Common';
import CreateSubnet, { SubnetProps } from './Subnet';
import SecurityGroup from './SecurityGroup';
import RouteTable from './RouteTable';
import AppGatewaySecurityRule from './NSGRules/AppGatewaySecurityRule';

export type DelegateServices =
  | 'Microsoft.ContainerInstance/containerGroups'
  | 'Microsoft.Web/serverFarms';

export interface VnetProps extends BasicResourceArgs {
  ddosId?: pulumi.Input<string>;
  /** the prefix space of vnet: ex [192.168.0.0/16]. If not provided it will collect from subnet */
  addressSpaces?: Array<pulumi.Input<string>>;
  subnets?: SubnetProps[];
  dnsServers?: pulumi.Input<pulumi.Input<string>[]>;
  natGateway?: network.NatGateway;

  features?: {
    securityGroup?: {
      enabled?: boolean;
      /**Add Security rule to block/allow internet if it is TRUE*/
      allowOutboundInternetAccess?: boolean;
      rules?: pulumi.Input<CustomSecurityRuleArgs>[];
    };

    routeTable?: { enabled?: boolean; rules?: pulumi.Input<RouteArgs>[] };

    appGatewaySubnet?: {
      addressPrefix: string;
      version: 'v1' | 'v2';
    };

    gatewaySubnet?: {
      addressPrefix: string;
    };

    firewall?: {
      /** Subnet address Prefix */
      addressPrefix: string;
      enableNatGateway?: boolean;
      managementAddressPrefix?: string;
    };

    //Enable Bastion host for Remove desktop via a web browser without open RDP port.
    bastion?: {
      /** Subnet address Prefix */
      addressPrefix: string;
    };
  };
}

export type VnetResult = ResourceInfo & {
  vnet: network.VirtualNetwork;
  appGatewaySubnet: pulumi.OutputInstance<
    outputs.network.SubnetResponse | undefined
  >;
  gatewaySubnet: pulumi.OutputInstance<
    outputs.network.SubnetResponse | undefined
  >;
  firewallManageSubnet: pulumi.OutputInstance<
    outputs.network.SubnetResponse | undefined
  >;
  routeTable?: network.RouteTable;
  firewallSubnet: pulumi.OutputInstance<
    outputs.network.SubnetResponse | undefined
  >;
  bastionSubnet: pulumi.OutputInstance<
    outputs.network.SubnetResponse | undefined
  >;
  findSubnet: (
    name: string,
  ) => pulumi.OutputInstance<outputs.network.SubnetResponse | undefined>;
  securityGroup: undefined | network.NetworkSecurityGroup;
};

export default ({
  name,
  group,
  ddosId,
  addressSpaces,
  subnets = [],
  natGateway,
  dnsServers,
  features = {},
  dependsOn,
}: VnetProps): VnetResult => {
  const vName = getVnetName(name);
  const securityRules = features.securityGroup?.rules || [];

  //AppGateway
  if (features.appGatewaySubnet) {
    subnets.push({
      name: appGatewaySubnetName,
      addressPrefix: features.appGatewaySubnet.addressPrefix,
      allowedServiceEndpoints: false,
      enableSecurityGroup: false,
      enableRouteTable: false,
    });

    //TODO: Move this to vnetBuilder instead. Add Security Rules for App Gateway
    securityRules.push(...AppGatewaySecurityRule(features.appGatewaySubnet));
  }

  //Gateway Subnet
  if (features?.gatewaySubnet) {
    subnets.push({
      name: gatewaySubnetName,
      addressPrefix: features.gatewaySubnet.addressPrefix,
      allowedServiceEndpoints: false,
      enableSecurityGroup: false,
      enableRouteTable: false,
    });
  }

  //Bastion Host
  if (features.bastion) {
    subnets.push({
      name: azBastionSubnetName,
      addressPrefix: features.bastion.addressPrefix,
      allowedServiceEndpoints: false,
      enableSecurityGroup: true,
      enableRouteTable: false,
    });
  }

  //Firewall Subnet
  if (features.firewall) {
    subnets.push({
      name: azFirewallSubnet,
      addressPrefix: features.firewall.addressPrefix,
      allowedServiceEndpoints: false,
      enableSecurityGroup: false,
      enableRouteTable: true,
      enableNatGateway: features.firewall.enableNatGateway,
    });

    if (features.firewall.managementAddressPrefix)
      subnets.push({
        name: azFirewallManagementSubnet,
        addressPrefix: features.firewall.managementAddressPrefix,
        allowedServiceEndpoints: false,
        enableSecurityGroup: false,
        enableNatGateway: false,
        enableRouteTable: false,
      });
  }

  //NetworkSecurityGroup
  let securityGroup: network.NetworkSecurityGroup | undefined = undefined;
  if (features.securityGroup?.enabled) {
    //Allow outbound internet
    if (!features.securityGroup.allowOutboundInternetAccess) {
      securityRules.push({
        name: 'DefaultDeniedInternetOutbound',
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

    securityGroup = SecurityGroup({
      name: vName,
      group,
      securityRules,
    });
  }

  //Route Table
  const routeRules = features.routeTable?.rules || [];
  const routeTable = features.routeTable?.enabled
    ? RouteTable({
        name: vName,
        group,
        routes: routeRules,
      })
    : undefined;

  //Create VNet
  const vnet = new network.VirtualNetwork(
    vName,
    {
      virtualNetworkName: vName,
      addressSpace: {
        addressPrefixes: addressSpaces || subnets.map((s) => s.addressPrefix),
      },
      ...group,
      enableVmProtection: true,
      encryption: { enabled: true, enforcement: 'AllowUnencrypted' },
      dhcpOptions: dnsServers ? { dnsServers } : undefined,
      subnets: subnets.map((s) =>
        CreateSubnet({
          subnet: s,
          vnetName: name,
          group,

          natGateway: s.enableNatGateway ? natGateway : undefined,
          securityGroup:
            s.enableSecurityGroup === false ? undefined : securityGroup,
          routeTable: s.enableRouteTable === false ? undefined : routeTable,
        }),
      ),

      enableDdosProtection: ddosId !== undefined,
      ddosProtectionPlan: ddosId ? { id: ddosId } : undefined,
    },
    { dependsOn, ignoreChanges: ['virtualNetworkPeerings'] },
  );

  const findSubnet = (name: string) =>
    vnet.subnets.apply((ss) => ss!.find((s) => s.name === name));

  //Return the results
  return {
    name: vName,
    group,
    id: vnet.id,
    vnet,
    securityGroup,
    routeTable,
    findSubnet,

    firewallSubnet: findSubnet(azFirewallSubnet),
    firewallManageSubnet: findSubnet(azFirewallManagementSubnet),
    appGatewaySubnet: findSubnet(appGatewaySubnetName),
    gatewaySubnet: findSubnet(gatewaySubnetName),
    bastionSubnet: findSubnet(azBastionSubnetName),
  };
};
