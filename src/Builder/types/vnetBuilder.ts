import { Input } from '@pulumi/pulumi';
import * as network from '@pulumi/azure-native/network';
import { BuilderProps, IBuilder, OmitBuilderProps } from './genericBuilder';
import { VnetProps, VnetResult } from '../../VNet/Vnet';
import { SubnetProps } from '../../VNet/Subnet';
import { BasicResourceArgs, WithLogInfo } from '../../types';
import {
  PeeringDirectionType,
  PeeringOptions,
} from '../../VNet/NetworkPeering';
import { FirewallProps, FirewallResult } from '../../VNet/Firewall';
import { VpnGatewayProps } from '../../VNet/VPNGateway';
import { CustomSecurityRuleArgs, RouteArgs } from '../../VNet/types';
import { PublicIpAddressPrefixResult } from '../../VNet/IpAddressPrefix';
import { IPrivateDnsZoneBuilder } from './privateDnsZoneBuilder';

export type VnetBuilderArgs = BuilderProps & WithLogInfo;
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
      options?: Pick<
        PeeringOptions,
        'useRemoteGateways' | 'doNotVerifyRemoteGateways'
      >;
    }
  | {
      vnetId: Input<string>;
      direction?: PeeringDirectionType;
      options?: Pick<
        PeeringOptions,
        'useRemoteGateways' | 'doNotVerifyRemoteGateways'
      >;
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
  withPublicIP(type: 'prefix' | 'individual'): IGatewayFireWallBuilder;
  withPublicIPFrom(id: Input<string>): IGatewayFireWallBuilder;
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
  withSecurityRules(...rules: CustomSecurityRuleArgs[]): IVnetBuilder;
  withRouteRules(...rules: RouteArgs[]): IVnetBuilder;
  // withLogInfo(info: LogInfo): IVnetBuilder;
  withVpnGateway(props: VpnGatewayCreationProps): IVnetBuilder;
  peeringTo(props: PeeringProps): IVnetBuilder;
}
