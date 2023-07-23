import * as network from '@pulumi/azure-native/network';
import { input as inputs } from '@pulumi/azure-native/types';
import { Input, output, Resource } from '@pulumi/pulumi';
import * as pulumi from '@pulumi/pulumi';

import { getResourceInfoFromId } from '../Common/AzureEnv';
import { NetworkRouteResource } from '../CustomProviders/NetworkRuote';
import {
  BasicMonitorArgs,
  BasicResourceArgs,
  DefaultResourceArgs,
  ResourceGroupInfo,
} from '../types';
import Firewall, { FirewallSkus, FwOutboundConfig } from './Firewall';
import { FirewallPolicyProps } from './FirewallRules/types';
import VnetPeering from './NetworkPeering';
import { SubnetProps } from './Subnet';
import Vnet from './Vnet';

interface Props {
  name: string;
  group: ResourceGroupInfo;
  ddosId?: Input<string>;
  addressSpace?: Input<string>[];
  subnets?: SubnetProps[];
  publicIpAddress?: network.PublicIPAddress;
  dnsServers?: pulumi.Input<pulumi.Input<string>[]>;

  features?: {
    enableBastion?: {
      subnetPrefix: string;
      disableBastionHostCreation?: boolean;
    };

    enableAppGateway?: { subnetPrefix: string };

    enableFirewall?: {
      subnetPrefix: string;
      /** Only required if Firewall is Basic tier */
      managementSubnetPrefix?: string;
      sku?: FirewallSkus;
      publicManageIpAddress?: network.PublicIPAddress;

      policy: Omit<FirewallPolicyProps, 'enabled'>;

      /** set this is TRUE if want to create firewall subnet but not create firewall component */
      disabledFirewallCreation?: boolean;
    };

    vnetPeering?: Array<{
      vnetId: Input<string>;
      /** To create a route and Security access to the applicant */
      firewallPrivateIpAddress?: Input<string>;
    }>;

    securityGroup?: {
      allowInternetAccess: boolean;
      rules?: Input<inputs.network.SecurityRuleArgs>[];
    };
  };

  monitorConfig?: BasicMonitorArgs;
}

export default async ({
  group,
  name,
  ddosId,
  addressSpace,
  publicIpAddress,
  subnets,
  features = {},
  monitorConfig,
  ...others
}: Props) => {
  const securities =
    features.securityGroup?.rules ||
    new Array<Input<inputs.network.SecurityRuleArgs>>();
  const routes = new Array<Input<inputs.network.RouteArgs>>();

  if (publicIpAddress) {
    //Add route from IpAddress to internet
    if (features.enableFirewall) {
      routes.push({
        name: `firewall-to-internet`,
        addressPrefix: publicIpAddress.ipAddress.apply((i) => `${i}/32`),
        nextHopType: network.RouteNextHopType.Internet,
      });
    } //Allow Internet to public IpAddress security group
    else
      securities.push({
        name: 'allow-internet-publicIpAddress',
        sourceAddressPrefix: '*',
        sourcePortRange: '*',
        destinationAddressPrefix: publicIpAddress.ipAddress.apply(
          (i) => `${i}/32`
        ),
        destinationPortRanges: ['443', '80'],
        protocol: 'TCP',
        access: 'Allow',
        direction: 'Inbound',
        priority: 200 + securities.length + 1,
      });
  }

  //Update Security Group
  if (features.vnetPeering) {
    features.vnetPeering.forEach((pp, index) => {
      // The below rules should not be duplicated.
      if (pp.firewallPrivateIpAddress) {
        //Update route to firewall IpAddress
        routes.push({
          name: `vnet-to-firewall`,
          addressPrefix: '0.0.0.0/0',
          nextHopType: network.RouteNextHopType.VirtualAppliance,
          nextHopIpAddress: pp.firewallPrivateIpAddress,
        });

        //Allow Vnet to Firewall
        securities.push({
          name: `allow-vnet-to-firewall`,
          sourceAddressPrefix: '*',
          sourcePortRange: '*',
          destinationAddressPrefix: pp.firewallPrivateIpAddress,
          destinationPortRange: '*',
          protocol: '*',
          access: 'Allow',
          direction: 'Outbound',
          priority: 100,
        });
      }

      securities.push({
        name: `allow-vnet-to-vnet-${index}`,
        sourceAddressPrefix: 'VirtualNetwork',
        sourcePortRange: '*',
        destinationAddressPrefix: 'VirtualNetwork',
        destinationPortRange: '*',
        protocol: '*',
        access: 'Allow',
        direction: 'Outbound',
        priority: 101,
      });
    });
  }

  //Vnet
  const vnet = Vnet({
    group,
    name,
    ddosId,
    addressSpaces: addressSpace,

    subnets,
    features: {
      securityGroup: features.securityGroup
        ? {
            allowInternetAccess: features.securityGroup.allowInternetAccess,
            rules: securities,
          }
        : undefined,
      routeTable: { rules: routes },

      appGatewaySubnet: features.enableAppGateway
        ? {
            addressPrefix: features.enableAppGateway.subnetPrefix,
            version: 'v1',
          }
        : undefined,

      firewall: features.enableFirewall
        ? {
            addressPrefix: features.enableFirewall.subnetPrefix,
            managementAddressPrefix:
              features.enableFirewall.managementSubnetPrefix,
          }
        : undefined,

      bastion: features.enableBastion
        ? {
            addressPrefix: features.enableBastion.subnetPrefix,
            disableBastionHostCreation:
              features.enableBastion.disableBastionHostCreation,
          }
        : undefined,
    },
    ...others,
  });

  //Firewall
  let firewall:
    | {
        firewall: network.AzureFirewall;
        policy: network.FirewallPolicy | undefined;
      }
    | undefined;

  if (
    features.enableFirewall &&
    !features.enableFirewall.disabledFirewallCreation
  ) {
    firewall = await createFirewall({
      name,
      group,

      policy: {
        enabled: true,
        ...features.enableFirewall.policy,
      },

      outbound: [
        {
          name: `${name}-outbound`,
          publicIpAddress: publicIpAddress!,
          subnetId: vnet.firewallSubnet!.apply((c) => c!.id!),
        },
      ],
      management: features.enableFirewall.publicManageIpAddress
        ? {
            name: `${name}-management`,
            publicIpAddress: features.enableFirewall.publicManageIpAddress,
            subnetId: vnet.firewallManageSubnet!.apply((c) => c!.id!),
          }
        : undefined,
      sku: features.enableFirewall.sku,

      routeTableName: vnet.routeTable.name,
      monitorConfig,
      dependsOn: [vnet.routeTable, vnet.vnet],
    });
  }

  //Vnet Peering
  if (features.vnetPeering) {
    features.vnetPeering.map((pp) => {
      //get info
      output(pp.vnetId).apply((id) => {
        const info = getResourceInfoFromId(id);

        if (info) {
          //peering
          VnetPeering({
            name,
            firstVNetName: vnet.vnet.name,
            firstVNetResourceGroupName: group.resourceGroupName,
            secondVNetName: info.name,
            secondVNetResourceGroupName: info.group.resourceGroupName,
          });
        }
      });

      //Update route to firewall IpAddress
      if (pp.firewallPrivateIpAddress) {
        new NetworkRouteResource(
          `${name}-vnet-to-firewall`,
          {
            routeName: 'vnet-to-firewall',
            ...group,
            routeTableName: vnet.routeTable.name,
            addressPrefix: '0.0.0.0/0',
            nextHopType: network.RouteNextHopType.VirtualAppliance,
            nextHopIpAddress: pp.firewallPrivateIpAddress,
          },
          {
            dependsOn: vnet.routeTable,
          }
        );
      }
    });
  }

  //Return the results
  return { publicIpAddress, ...vnet, firewall };
};

interface FirewallProps
  extends BasicResourceArgs,
    Omit<DefaultResourceArgs, 'monitoring'> {
  sku?: FirewallSkus;
  outbound: Array<FwOutboundConfig>;
  /** This must be provided if sku is Basic */
  management?: FwOutboundConfig;
  routeTableName?: Input<string>;
  policy: FirewallPolicyProps;
  monitorConfig?: BasicMonitorArgs;
  dependsOn?: Input<Resource>[];
}

const createFirewall = async ({
  name,
  group,
  routeTableName,
  dependsOn = [],
  ...others
}: FirewallProps) => {
  const rs = await Firewall({
    name,
    group,
    ...others,
    dependsOn,
  });

  if (routeTableName) {
    //Route Vnet to Firewall
    new NetworkRouteResource(
      `${name}-vnet-to-firewall`,
      {
        routeName: `vnet-to-firewall`,
        ...group,
        routeTableName: routeTableName,
        addressPrefix: '0.0.0.0/0',
        nextHopType: network.RouteNextHopType.VirtualAppliance,
        nextHopIpAddress: rs.firewall.ipConfigurations.apply((c) =>
          c ? c[0].privateIPAddress : ''
        ),
      },
      {
        dependsOn: [...dependsOn, rs.firewall],
      }
    );
  }

  return rs;
};
