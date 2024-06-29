import * as network from "@pulumi/azure-native/network";
import { input as inputs } from "@pulumi/azure-native/types";
import { Input, output } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import { NetworkRouteResource } from "@drunk-pulumi/azure-providers";
import { BasicMonitorArgs, ResourceGroupInfo } from "../types";
import { CustomSecurityRuleArgs } from "./types";
import Firewall, { FirewallSkus, FirewallProps } from "./Firewall";
import { FirewallPolicyProps } from "./types";
import VnetPeering from "./NetworkPeering";
import { SubnetProps } from "./Subnet";
import Vnet from "./Vnet";
import { parseVnetInfoFromId } from "./Helper";

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
    };

    enableAppGateway?: { subnetPrefix: string };

    enableFirewall?: {
      subnetPrefix: string;
      /** Only required if Firewall is Basic tier */
      managementSubnetPrefix?: string;
      sku?: FirewallSkus;
      policy: Omit<FirewallPolicyProps, "enabled">;

      /** set this is TRUE if want to create firewall subnet but not create firewall component */
      disabledFirewallCreation?: boolean;
    };

    vnetPeering?: Array<{
      vnetId: Input<string>;
      /** To create a route and Security access to the applicant */
      firewallPrivateIpAddress?: Input<string>;
    }>;

    securityGroup?: {
      /**Add Security rule to block/allow inbound internet if it is TRUE*/
      allowInboundInternetAccess?: boolean;
      /**Add Security rule to block/allow internet if it is TRUE*/
      allowOutboundInternetAccess?: boolean;
      rules?: Input<CustomSecurityRuleArgs>[];
    };
  };

  monitorConfig?: BasicMonitorArgs;
}

export default ({
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
  const securities = features.securityGroup?.rules || [];
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
    else if (features.securityGroup?.allowInboundInternetAccess)
      securities.push({
        name: "allow-inbound-internet-publicIpAddress",
        sourceAddressPrefix: "*",
        sourcePortRange: "*",
        destinationAddressPrefix: publicIpAddress.ipAddress.apply(
          (i) => `${i}/32`,
        ),
        destinationPortRanges: ["443", "80"],
        protocol: "TCP",
        access: "Allow",
        direction: "Inbound",
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
          addressPrefix: "0.0.0.0/0",
          nextHopType: network.RouteNextHopType.VirtualAppliance,
          nextHopIpAddress: pp.firewallPrivateIpAddress,
        });

        //Allow Vnet to Firewall
        securities.push({
          name: `allow-vnet-to-firewall`,
          sourceAddressPrefix: "*",
          sourcePortRange: "*",
          destinationAddressPrefix: pp.firewallPrivateIpAddress,
          destinationPortRange: "*",
          protocol: "*",
          access: "Allow",
          direction: "Outbound",
          priority: 100,
        });
      }

      securities.push({
        name: `allow-vnet-to-vnet-${index}`,
        sourceAddressPrefix: "VirtualNetwork",
        sourcePortRange: "*",
        destinationAddressPrefix: "VirtualNetwork",
        destinationPortRange: "*",
        protocol: "*",
        access: "Allow",
        direction: "Outbound",
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
            ...features.securityGroup,
            rules: securities,
          }
        : undefined,
      routeTable: { rules: routes },

      appGatewaySubnet: features.enableAppGateway
        ? {
            addressPrefix: features.enableAppGateway.subnetPrefix,
            version: "v1",
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
    firewall = createFirewall({
      name,
      group,

      policy: {
        ...features.enableFirewall.policy,
      },

      outbound: [
        {
          publicIpAddress: publicIpAddress!,
          subnetId: vnet.firewallSubnet.apply((c) => c!.id!),
        },
      ],
      management: features?.enableFirewall.managementSubnetPrefix
        ? {
            subnetId: vnet.firewallManageSubnet.apply((c) => c!.id!),
          }
        : undefined,

      sku: features.enableFirewall.sku,
      routeTableName: vnet.routeTable?.name,
      monitorConfig,
      dependsOn: [vnet.vnet],
    });
  }

  //Vnet Peering
  if (features.vnetPeering) {
    features.vnetPeering.map((pp) => {
      const info = parseVnetInfoFromId(pp.vnetId);
      VnetPeering({
        firstVnet: {
          vnetName: vnet.vnet.name,
          resourceGroupName: group.resourceGroupName,
        },
        secondVnet: info,
      });

      //Update route to firewall IpAddress
      if (pp.firewallPrivateIpAddress && vnet.routeTable) {
        new NetworkRouteResource(
          `${name}-vnet-to-firewall`,
          {
            routeName: "vnet-to-firewall",
            ...group,
            routeTableName: vnet.routeTable.name,
            addressPrefix: "0.0.0.0/0",
            nextHopType: network.RouteNextHopType.VirtualAppliance,
            nextHopIpAddress: pp.firewallPrivateIpAddress,
          },
          {
            dependsOn: vnet.routeTable,
          },
        );
      }
    });
  }

  //Return the results
  return { publicIpAddress, ...vnet, firewall };
};

const createFirewall = ({
  name,
  group,
  routeTableName,
  dependsOn = [],
  ...others
}: FirewallProps & { routeTableName?: Input<string> }) => {
  const rs = Firewall({
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
        addressPrefix: "0.0.0.0/0",
        nextHopType: network.RouteNextHopType.VirtualAppliance,
        nextHopIpAddress: rs.firewall.ipConfigurations.apply((c) =>
          c ? c[0].privateIPAddress : "",
        ),
      },
      {
        dependsOn: [rs.firewall],
      },
    );
  }

  return rs;
};
