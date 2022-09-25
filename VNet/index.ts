import { Input, output, Resource } from '@pulumi/pulumi';
import { input as inputs } from '@pulumi/azure-native/types';
import * as network from '@pulumi/azure-native/network';
import IpAddress from './IpAddress';
import {
  BasicMonitorArgs,
  BasicResourceArgs,
  DefaultResourceArgs,
  ResourceGroupInfo,
} from '../types';
import Vnet, { SubnetProps } from './Vnet';
import Firewall from './Firewall';
import VnetPeering from './NetworkPeering';
import {
  FirewallPolicyCreator,
  FirewallPolicyProps,
  FirewallRuleCreator,
  FirewallRuleResults,
} from './FirewallRules/types';
import { getResourceInfoFromId } from '../Common/ResourceEnv';
import * as pulumi from '@pulumi/pulumi';
import { NetworkRouteResource } from '../CustomProviders/NetworkRuote';

interface Props {
  name: string;
  group: ResourceGroupInfo;
  ddosId?: Input<string>;
  addressSpace?: Input<string>[];
  subnets?: SubnetProps[];
  dnsServers?: pulumi.Input<pulumi.Input<string>[]>;

  features: {
    enablePublicIpAddress?: boolean;
    enableBastion?: { subnetPrefix: string; donotCreateBastionHost?: boolean };
    enableAppGateway?: { subnetPrefix: string };

    enableFirewall?: {
      subnetPrefix: string;
      /** set this is TRUE if want to create firewall subnet but not create firewall component */
      donotCreateFirewall?: boolean;
      ruleCreator?: FirewallRuleCreator;
      policyCreator?: FirewallPolicyCreator;
    };

    vnetPeerings?: Array<{
      vnetId: Input<string>;
      /**To create a route and Security access to the applicant*/
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
  subnets,
  features = {},
  monitorConfig,
  ...others
}: Props) => {
  const securities =
    features.securityGroup?.rules ||
    new Array<Input<inputs.network.SecurityRuleArgs>>();
  const routes = new Array<Input<inputs.network.RouteArgs>>();

  //Create IpAddress
  const publicIpAddress =
    features.enablePublicIpAddress || features.enableFirewall
      ? IpAddress({
          group,
          name,
          sku: { name: 'Standard', tier: 'Regional' },
        })
      : undefined;

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
        destinationAddressPrefix: publicIpAddress.ipAddress.apply((i) => i!),
        destinationPortRanges: ['443', '80'],
        protocol: 'TCP',
        access: 'Allow',
        direction: 'Inbound',
        priority: 200 + securities.length + 1,
      });
  }

  //Update Security Group
  if (features.vnetPeerings) {
    features.vnetPeerings.forEach((pp) => {
      if (pp.firewallPrivateIpAddress) {
        //Update route to firewall IpAddress
        routes.push({
          name: 'vnet-to-firewall',
          addressPrefix: '0.0.0.0/0',
          nextHopType: network.RouteNextHopType.VirtualAppliance,
          nextHopIpAddress: pp.firewallPrivateIpAddress,
        });

        //Allow Vnet to Firewall
        securities.push({
          name: 'allow-vnet-to-firewall',
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
        name: 'allow-vnet-to-vnet',
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
        ? { addressPrefix: features.enableFirewall.subnetPrefix }
        : undefined,

      bastion: features.enableBastion
        ? {
            addressPrefix: features.enableBastion.subnetPrefix,
            donotCreateBastionHost:
              features.enableBastion.donotCreateBastionHost,
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

  if (features.enableFirewall && !features.enableFirewall.donotCreateFirewall) {
    firewall = await createFirewall({
      name,
      group,
      publicIpAddress: publicIpAddress!,

      policy: features.enableFirewall.policyCreator
        ? {
            enabled: true,
            ...features.enableFirewall.policyCreator({
              publicIpAddress: publicIpAddress!,
            }),
          }
        : undefined,

      rules: features.enableFirewall.ruleCreator
        ? features.enableFirewall.ruleCreator({
            publicIpAddress: publicIpAddress!,
          })
        : undefined,

      subnetId: vnet.firewallSubnet!.apply((c) => c!.id!),
      routeTableName: vnet.routeTable.name,
      monitorConfig,
      dependsOn: [vnet.routeTable, vnet.vnet],
    });
  }

  //Vnet Peering
  if (features.vnetPeerings) {
    features.vnetPeerings.map((pp) => {
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
  publicIpAddress: network.PublicIPAddress;
  subnetId: Input<string>;
  routeTableName?: Input<string>;
  policy?: FirewallPolicyProps;
  rules?: FirewallRuleResults;
  monitorConfig?: BasicMonitorArgs;
  dependsOn?: Input<Resource>[];
}

const createFirewall = async ({
  name,
  group,
  publicIpAddress,
  subnetId,
  routeTableName,
  dependsOn = [],
  ...others
}: FirewallProps) => {
  const rs = await Firewall({
    name,
    group,
    ...others,
    outbound: [
      {
        name: `${name}-outbound`,
        publicIpAddressId: publicIpAddress.id,
        subnetId,
      },
    ],

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
