import { Input } from "@pulumi/pulumi";
import * as network from "@pulumi/azure-native/network";
import { BuilderProps, CommonOmit, IBuilder } from "./genericBuilder";
import { VnetProps, VnetResult } from "../../VNet/Vnet";
import { SubnetProps } from "../../VNet/Subnet";
import { BasicResourceArgs } from "../../types";
import { PeeringDirectionType } from "../../VNet/NetworkPeering";
import { FirewallProps, FirewallResult } from "../../VNet/Firewall";
import { VpnGatewayProps } from "../../VNet/VPNGateway";
import { CustomSecurityRuleArgs, RouteArgs } from "../../VNet/types";
import { LogInfoResults } from "../../Logs/Helpers";
import { PublicIpAddressPrefixResult } from "../../VNet/IpAddressPrefix";

//VNet Builder Types
export type VnetBuilderProps = {
  subnets?: SubnetCreationProps;
} & Pick<VnetProps, "addressSpaces" | "dnsServers">;
export type SubnetCreationProps = Record<string, Omit<SubnetProps, "name">>;
export type SubnetPrefixCreationProps = { addressPrefix: string };
export type BastionCreationProps = { subnet: SubnetPrefixCreationProps } & Pick<
  BasicResourceArgs,
  "importUri" | "ignoreChanges"
>;
export type PeeringProps =
  | {
      groupName: string;
      direction?: PeeringDirectionType;
    }
  | {
      vnetId: Input<string>;
      direction?: PeeringDirectionType;
    };
export type FirewallCreationProps = {
  subnet: SubnetPrefixCreationProps & { managementAddressPrefix: string };
} & CommonOmit<Omit<FirewallProps, "outbound" | "management">>;
export type VpnGatewayCreationProps = Pick<
  VpnGatewayProps,
  "sku" | "vpnClientAddressPools"
> & { subnetSpace: string };

//Starting Interface
export interface IVnetBuilderStart {
  asHub: (props?: VnetBuilderProps) => IPublicIpBuilder;
  asSpoke: (props?: VnetBuilderProps) => IVnetBuilder;
}
export interface IPublicIpBuilder {
  withPublicIpAddress: (
    type: "prefix" | "individual",
  ) => IGatewayFireWallBuilder;
}

export interface IFireWallOrVnetBuilder extends IBuilder<VnetBuilderResults> {
  withFirewall: (props: FirewallCreationProps) => IVnetBuilder;
}

export interface IGatewayFireWallBuilder extends IFireWallOrVnetBuilder {
  withNatGateway: () => IFireWallOrVnetBuilder;
}

export interface IVnetBuilder extends IBuilder<VnetBuilderResults> {
  withBastion: (props: BastionCreationProps) => IVnetBuilder;
  peeringTo: (props: PeeringProps) => IVnetBuilder;
  withSecurityRules: (rules: CustomSecurityRuleArgs[]) => IVnetBuilder;
  withRouteRules: (rules: RouteArgs[]) => IVnetBuilder;
  withLogInfo: (info: LogInfoResults) => IVnetBuilder;
  withVpnGateway: (props: VpnGatewayCreationProps) => IVnetBuilder;
}

export type VnetBuilderResults = {
  publicIpAddress: PublicIpAddressPrefixResult | undefined;
  firewall: FirewallResult | undefined;
  vnet: VnetResult;
  natGateway: network.NatGateway | undefined;
  vnpGateway: network.VirtualNetworkGateway | undefined;
};
