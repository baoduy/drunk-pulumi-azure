import IpAddressPrefix, {
  PublicIpAddressPrefixResult,
} from "../VNet/IpAddressPrefix";
import * as network from "@pulumi/azure-native/network";
import { CustomSecurityRuleArgs, RouteArgs } from "../types";
import Firewall, { FirewallResult } from "../VNet/Firewall";
import Vnet, { VnetResult } from "../VNet/Vnet";
import { SubnetProps } from "../VNet/Subnet";
import NatGateway from "../VNet/NatGateway";
import * as pulumi from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/azure-native/types";
import NetworkPeering, { NetworkPeeringResults } from "../VNet/NetworkPeering";
import { LogInfoResults } from "../Logs/Helpers";
import VPNGateway from "../VNet/VPNGateway";
import {
  BastionCreationProps,
  FirewallCreationProps,
  IFireWallOrVnetBuilder,
  IGatewayFireWallBuilder,
  IPublicIpBuilder,
  IVnetBuilder,
  IVnetBuilderStart,
  PeeringProps,
  ResourcesBuilder,
  SubnetCreationProps,
  VnetBuilderProps,
  VnetBuilderResults,
  VpnGatewayCreationProps,
} from "./types";

const outboundIpName = "outbound";

class VnetBuilder
  extends ResourcesBuilder<VnetBuilderResults>
  implements IGatewayFireWallBuilder, IVnetBuilder, IVnetBuilderStart
{
  /** The Props */
  private readonly _subnetProps: SubnetCreationProps | undefined = undefined;
  private readonly _vnetProps: Partial<VnetBuilderProps>;
  private _firewallProps: FirewallCreationProps | undefined = undefined;
  private _bastionProps: BastionCreationProps | undefined = undefined;
  private _natGatewayEnabled?: boolean = false;
  private _vpnGatewayProps: VpnGatewayCreationProps | undefined = undefined;
  private _securityRules: CustomSecurityRuleArgs[] | undefined = undefined;
  private _routeRules: pulumi.Input<inputs.network.RouteArgs>[] | undefined =
    undefined;
  private _peeringProps: PeeringProps | undefined = undefined;
  private _logInfo: LogInfoResults | undefined = undefined;
  private _ipType: "prefix" | "individual" = "prefix";

  /** The Instances */
  private _ipAddressInstance: PublicIpAddressPrefixResult | undefined =
    undefined;
  private _firewallInstance: FirewallResult | undefined = undefined;
  private _vnetInstance: VnetResult | undefined = undefined;
  private _natGatewayInstance: network.NatGateway | undefined = undefined;
  private _peeringInstance: NetworkPeeringResults | undefined = undefined;
  private _vnpGatewayInstance: network.VirtualNetworkGateway | undefined =
    undefined;

  constructor({
    subnets,
    dnsServers,
    addressSpaces,
    ...commonProps
  }: VnetBuilderProps) {
    super(commonProps);
    this._subnetProps = subnets;
    this._vnetProps = { dnsServers, addressSpaces };
  }

  public asHub(): IPublicIpBuilder {
    return this;
  }
  public asSpoke(): IVnetBuilder {
    return this;
  }

  public withPublicIpAddress(
    type: "prefix" | "individual",
  ): IGatewayFireWallBuilder {
    this._ipType = type;
    return this;
  }

  public withNatGateway(): IFireWallOrVnetBuilder {
    this._natGatewayEnabled = true;
    return this;
  }

  public withVpnGateway(props: VpnGatewayCreationProps): IVnetBuilder {
    this._vpnGatewayProps = props;
    return this;
  }

  public withFirewall(props: FirewallCreationProps): IVnetBuilder {
    this._firewallProps = props;
    return this;
  }

  public withBastion(props: BastionCreationProps): IVnetBuilder {
    this._bastionProps = props;
    return this;
  }

  public withSecurityRules(rules: CustomSecurityRuleArgs[]): IVnetBuilder {
    if (!this._securityRules) this._securityRules = rules;
    else this._securityRules.push(...rules);
    return this;
  }

  public withRouteRules(rules: RouteArgs[]): IVnetBuilder {
    if (!this._routeRules) this._routeRules = rules;
    else this._routeRules.push(...rules);
    return this;
  }

  public peeringTo(props: PeeringProps): IVnetBuilder {
    this._peeringProps = props;
    return this;
  }

  public withLogInfo(info: LogInfoResults): IVnetBuilder {
    this._logInfo = info;
    return this;
  }

  /** Builders methods */
  // private validate() {
  //   if (this._firewallProps) {
  //     if (!this._firewallProps.sku)
  //       this._firewallProps.sku = this._natGatewayEnabled
  //         ? { tier: "Basic", name: "AZFW_VNet" }
  //         : { tier: "Basic", name: "AZFW_VNet" };
  //
  //     // if (this._natGatewayEnabled && this._firewallProps.sku.tier === "Basic")
  //     //   throw new Error(
  //     //     'The Firewall tier "Basic" is not support Nat Gateway.',
  //     //   );
  //   }
  // }

  private buildIpAddress() {
    const ipNames = [];

    //No gateway and no firewall then Do nothing
    if (!this._natGatewayEnabled && !this._firewallProps) return;

    //Add outbound Ipaddress for Firewall alone
    if (!this._natGatewayEnabled && this._firewallProps) {
      console.log(`${this.commonProps.name}: outbound ip will be created.`);
      ipNames.push(outboundIpName);
    }

    //Create IpPrefix
    this._ipAddressInstance = IpAddressPrefix({
      ...this.commonProps,
      ipAddresses: ipNames.map((n) => ({ name: n })),
      createPrefix: this._ipType === "prefix",
      config: { version: "IPv4", allocationMethod: "Static" },
    });
  }

  private buildNatGateway() {
    if (!this._natGatewayEnabled || !this._ipAddressInstance) return;

    this._natGatewayInstance = NatGateway({
      ...this.commonProps,

      publicIpAddresses:
        this._ipType === "individual"
          ? Object.keys(this._ipAddressInstance.addresses).map(
              (k) => this._ipAddressInstance!.addresses![k].id,
            )
          : undefined,

      publicIpPrefixes:
        this._ipType === "prefix"
          ? [this._ipAddressInstance.addressPrefix!.id]
          : undefined,
    });
  }

  private buildVnet() {
    const subnets = this._subnetProps
      ? Object.keys(this._subnetProps!).map(
          (k) =>
            ({
              name: k,
              //Link all subnets to nate gateway if available without a firewall.
              enableNatGateway:
                this._natGatewayEnabled && !Boolean(this._firewallInstance),
              //However, till able to overwrite from outside.
              ...this._subnetProps![k],
            }) as SubnetProps,
        )
      : [];

    this._vnetInstance = Vnet({
      ...this.commonProps,
      ...this._vnetProps,
      subnets,
      natGateway: this._natGatewayInstance,

      features: {
        //Only create Security group when firewall is not there
        securityGroup: {
          enabled: !this._firewallProps,
          allowOutboundInternetAccess:
            !Boolean(this._ipAddressInstance) && !this._natGatewayEnabled,
          rules: this._securityRules,
        },
        //Route tables
        routeTable: {
          enabled: this._routeRules && this._routeRules.length > 0,
          rules: this._routeRules,
        },
        //Firewall
        firewall: this._firewallProps
          ? {
              ...this._firewallProps.subnet,
              enableNatGateway: this._natGatewayEnabled,
            }
          : undefined,
        //Bastion
        bastion: this._bastionProps?.subnet,

        //Gateway
        gatewaySubnet: this._vpnGatewayProps
          ? { addressPrefix: this._vpnGatewayProps.subnetSpace }
          : undefined,
      },

      dependsOn: this._firewallInstance?.firewall
        ? this._firewallInstance?.firewall
        : this._natGatewayInstance
          ? this._natGatewayInstance
          : undefined,
    });
  }

  private buildFirewall() {
    if (!this._firewallProps) return;

    const publicIpAddress = this._ipAddressInstance?.addresses[outboundIpName];
    const firewallSubnetId = this._vnetInstance?.firewallSubnet?.apply(
      (s) => s?.id!,
    );
    const manageSubnetId = this._vnetInstance?.firewallManageSubnet?.apply(
      (s) => s?.id!,
    );

    this._firewallInstance = Firewall({
      ...this.commonProps,
      ...this._firewallProps,

      outbound: [
        {
          subnetId: firewallSubnetId!,
          //Using Force Tunneling mode if Nat gateway is enabled.
          publicIpAddress: this._natGatewayEnabled
            ? undefined
            : publicIpAddress!,
        },
      ],
      //This is required for Force Tunneling mode
      management: manageSubnetId
        ? {
            subnetId: manageSubnetId,
          }
        : undefined,

      monitorConfig: this._logInfo
        ? {
            logWpId: this._logInfo.logWp.id,
          }
        : undefined,

      dependsOn: this._ipAddressInstance?.addressPrefix,
    });
  }

  private buildVpnGateway() {
    if (!this._vpnGatewayProps) return;

    const subnetId = this._vnetInstance!.gatewaySubnet?.apply((s) => s?.id!);
    if (!subnetId) return;

    this._vnpGatewayInstance = VPNGateway({
      ...this.commonProps,
      ...this._vpnGatewayProps,
      subnetId,
      dependsOn: this._vnetInstance!.vnet,
    });
  }

  private buildPeering() {
    if (!this._peeringProps || !this._vnetInstance) return;

    this._peeringInstance = NetworkPeering({
      name: this.commonProps.name,
      firstVNetName: this._vnetInstance.vnet.name,
      firstVNetResourceGroupName: this.commonProps.group.resourceGroupName,
      secondVNetName: this._peeringProps.vnetName,
      secondVNetResourceGroupName: this._peeringProps.group.resourceGroupName,
    });
  }

  public build(): VnetBuilderResults {
    //this.validate();
    this.buildIpAddress();
    this.buildNatGateway();
    this.buildVnet();
    this.buildFirewall();
    this.buildVpnGateway();
    this.buildPeering();

    return {
      publicIpAddress: this._ipAddressInstance,
      firewall: this._firewallInstance,
      vnet: this._vnetInstance!,
      natGateway: this._natGatewayInstance,
      peering: this._peeringInstance,
      vnpGateway: this._vnpGatewayInstance,
    };
  }
}

export default (props: VnetBuilderProps) =>
  new VnetBuilder(props) as IVnetBuilderStart;
