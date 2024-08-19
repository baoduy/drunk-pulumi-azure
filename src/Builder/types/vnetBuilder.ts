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

/**
 * Arguments required for building a VNet resource.
 */
export type VnetBuilderArgs = BuilderProps & WithLogInfo;

/**
 * Results of the VNet builder.
 */
export type VnetBuilderResults = VnetResult & {
  publicIpAddress: PublicIpAddressPrefixResult | undefined;
  firewall: FirewallResult | undefined;
  natGateway: network.NatGateway | undefined;
  vnpGateway: network.VirtualNetworkGateway | undefined;
};

/**
 * Properties for building a VNet.
 */
export type VnetBuilderProps = {
  subnets?: SubnetCreationProps;
} & Pick<VnetProps, 'addressSpaces' | 'dnsServers'>;

/**
 * Properties for creating subnets.
 */
export type SubnetCreationProps = Record<string, Omit<SubnetProps, 'name'>>;

/**
 * Properties for creating subnet prefixes.
 */
export type SubnetPrefixCreationProps = { addressPrefix: string };

/**
 * Properties for creating a Bastion host.
 */
export type BastionCreationProps = { subnet: SubnetPrefixCreationProps } & Pick<
  BasicResourceArgs,
  'importUri' | 'ignoreChanges'
>;

/**
 * Properties for VNet peering.
 */
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

/**
 * Properties for creating a firewall.
 */
export type FirewallCreationProps = {
  subnet: SubnetPrefixCreationProps & { managementAddressPrefix: string };
} & OmitBuilderProps<Omit<FirewallProps, 'outbound' | 'management'>>;

/**
 * Properties for creating a VPN gateway.
 */
export type VpnGatewayCreationProps = Pick<
  VpnGatewayProps,
  'sku' | 'vpnClientAddressPools'
> & { subnetSpace: string };

/**
 * Function type for building a private DNS zone.
 */
export type VnetPrivateDnsBuilderFunc = (
  builder: IPrivateDnsZoneBuilder,
) => IPrivateDnsZoneBuilder;

/**
 * Interface for starting the VNet builder.
 */
export interface IVnetBuilderStart {
  /**
   * Initializes the VNet builder as a hub.
   * @param props - The VNet builder properties.
   * @returns An instance of IPublicIpBuilder.
   */
  asHub(props?: VnetBuilderProps): IPublicIpBuilder;
  
  /**
   * Initializes the VNet builder as a spoke.
   * @param props - The VNet builder properties.
   * @returns An instance of IVnetBuilder.
   */
  asSpoke(props?: VnetBuilderProps): IVnetBuilder;
}

/**
 * Interface for building public IP properties.
 */
export interface IPublicIpBuilder {
  /**
   * Sets the public IP properties.
   * @param type - The type of public IP.
   * @returns An instance of IGatewayFireWallBuilder.
   */
  withPublicIP(type: 'prefix' | 'individual'): IGatewayFireWallBuilder;
  
  /**
   * Sets the public IP properties from an existing ID.
   * @param id - The ID of the public IP.
   * @returns An instance of IGatewayFireWallBuilder.
   */
  withPublicIPFrom(id: Input<string>): IGatewayFireWallBuilder;
}

/**
 * Interface for building gateway and firewall properties.
 */
export interface IGatewayFireWallBuilder extends IBuilder<VnetBuilderResults> {
  /**
   * Sets the firewall and NAT gateway properties.
   * @param props - The firewall creation properties.
   * @returns An instance of IVnetBuilder.
   */
  withFirewallAndNatGateway(props: FirewallCreationProps): IVnetBuilder;
  
  /**
   * Sets the firewall properties.
   * @param props - The firewall creation properties.
   * @returns An instance of IVnetBuilder.
   */
  withFirewall(props: FirewallCreationProps): IVnetBuilder;
  
  /**
   * Sets the NAT gateway properties.
   * @returns An instance of IVnetBuilder.
   */
  withNatGateway(): IVnetBuilder;
}

/**
 * Interface for building a VNet.
 */
export interface IVnetBuilder extends IBuilder<VnetBuilderResults> {
  /**
   * Sets the Bastion host properties.
   * @param props - The Bastion creation properties.
   * @returns An instance of IVnetBuilder.
   */
  withBastion(props: BastionCreationProps): IVnetBuilder;
  
  /**
   * Sets the private DNS properties.
   * @param domain - The domain name.
   * @param builder - The private DNS builder function.
   * @returns An instance of IVnetBuilder.
   */
  withPrivateDns(
    domain: string,
    builder?: VnetPrivateDnsBuilderFunc,
  ): IVnetBuilder;
  
  /**
   * Sets the security rules for the VNet.
   * @param rules - The security rule arguments.
   * @returns An instance of IVnetBuilder.
   */
  withSecurityRules(...rules: CustomSecurityRuleArgs[]): IVnetBuilder;
  
  /**
   * Sets the route rules for the VNet.
   * @param rules - The route arguments.
   * @returns An instance of IVnetBuilder.
   */
  withRouteRules(...rules: RouteArgs[]): IVnetBuilder;
  
  /**
   * Sets the VPN gateway properties.
   * @param props - The VPN gateway creation properties.
   * @returns An instance of IVnetBuilder.
   */
  withVpnGateway(props: VpnGatewayCreationProps): IVnetBuilder;
  
  /**
   * Sets the peering properties for the VNet.
   * @param props - The peering properties.
   * @returns An instance of IVnetBuilder.
   */
  peeringTo(props: PeeringProps): IVnetBuilder;
}