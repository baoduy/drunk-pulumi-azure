import { Input } from '@pulumi/pulumi';
import * as network from '@pulumi/azure-native/network';
import { IBuilder, OmitBuilderProps } from './genericBuilder';
import { VnetProps, VnetResult } from '../../VNet/Vnet';
import { SubnetProps } from '../../VNet/Subnet';
import { BasicResourceArgs } from '../../types';
import {
  PeeringDirectionType,
  PeeringOptions,
} from '../../VNet/NetworkPeering';
import { FirewallProps, FirewallResult } from '../../VNet/Firewall';
import { VpnGatewayProps } from '../../VNet/VPNGateway';
import { CustomSecurityRuleArgs, RouteArgs } from '../../VNet/types';
import { LogInfoResults } from '../../Logs/Helpers';
import { PublicIpAddressPrefixResult } from '../../VNet/IpAddressPrefix';
import { IPrivateDnsZoneBuilder } from './privateDnsZoneBuilder';

//VNet Builder Types
export type VnetBuilderResults = VnetResult & {
  publicIpAddress: PublicIpAddressPrefixResult | undefined;
  firewall: FirewallResult | undefined;
  natGateway: network.NatGateway | undefined;
  vnpGateway: network.VirtualNetworkGateway | undefined;
};

export type VnetBuilderProps = {
  subnets?: SubnetCreationProps;
} & Pick<VnetProps, 'addressSpaces' | 'dnsServers'>;
export type SubnetCreationProps = Record<string, Omit<SubnetProps, 'name'>>;
export type SubnetPrefixCreationProps = { addressPrefix: string };
export type BastionCreationProps = { subnet: SubnetPrefixCreationProps } & Pick<
  BasicResourceArgs,
  'importUri' | 'ignoreChanges'
>;
export type PeeringProps =
  | {
      groupName: string;
      direction?: PeeringDirectionType;
      options?: PeeringOptions;
    }
  | {
      vnetId: Input<string>;
      direction?: PeeringDirectionType;
      options?: PeeringOptions;
    };
export type FirewallCreationProps = {
  subnet: SubnetPrefixCreationProps & { managementAddressPrefix: string };
} & OmitBuilderProps<Omit<FirewallProps, 'outbound' | 'management'>>;

export type VpnGatewayCreationProps = Pick<
  VpnGatewayProps,
  'sku' | 'vpnClientAddressPools'
> & { subnetSpace: string };

export type VnetPrivateDnsBuilderFunc = (
  builder: IPrivateDnsZoneBuilder,
) => IPrivateDnsZoneBuilder;

//Starting Interface
export interface IVnetBuilderStart {
  asHub(props?: VnetBuilderProps): IPublicIpBuilder;
  asSpoke(props?: VnetBuilderProps): IVnetBuilder;
}
export interface IPublicIpBuilder {
  withPublicIpAddress(type: 'prefix' | 'individual'): IGatewayFireWallBuilder;
}

export interface IGatewayFireWallBuilder extends IBuilder<VnetBuilderResults> {
  withFirewallAndNatGateway(props: FirewallCreationProps): IVnetBuilder;
  withFirewall(props: FirewallCreationProps): IVnetBuilder;
  withNatGateway(): IVnetBuilder;
}

export interface IVnetBuilder extends IBuilder<VnetBuilderResults> {
  withBastion(props: BastionCreationProps): IVnetBuilder;
  withPrivateDns(
    domain: string,
    builder?: VnetPrivateDnsBuilderFunc,
  ): IVnetBuilder;
  withSecurityRules(rules: CustomSecurityRuleArgs[]): IVnetBuilder;
  withRouteRules(rules: RouteArgs[]): IVnetBuilder;
  withLogInfo(info: LogInfoResults): IVnetBuilder;
  withVpnGateway(props: VpnGatewayCreationProps): IVnetBuilder;
  peeringTo(props: PeeringProps): IVnetBuilder;
}
