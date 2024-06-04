import IpAddressPrefix, {
  PublicIpAddressPrefixResult,
} from "../VNet/IpAddressPrefix";
import * as network from "@pulumi/azure-native/network";
import { CustomSecurityRuleArgs, RouteArgs, VnetInfoType } from "../VNet/types";
import Firewall, { FirewallResult } from "../VNet/Firewall";
import Vnet, { VnetResult } from "../VNet/Vnet";
import { SubnetProps } from "../VNet/Subnet";
import NatGateway from "../VNet/NatGateway";
import * as pulumi from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/azure-native/types";
import NetworkPeering from "../VNet/NetworkPeering";
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
  Builder,
  SubnetCreationProps,
  VnetBuilderProps,
  VnetBuilderResults,
  VpnGatewayCreationProps,
} from "./types";
import { getVnetInfo, parseVnetInfoFromId } from "../VNet/Helper";
import Bastion from "../VNet/Bastion";

const outboundIpName = "outbound";

class VnetBuilder
  extends Builder<VnetBuilderResults>
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
  private _peeringProps: PeeringProps[] = [];
  private _logInfo: LogInfoResults | undefined = undefined;
  private _ipType: "prefix" | "individual" = "prefix";

  /** The Instances */
  private _ipAddressInstance: PublicIpAddressPrefixResult | undefined =
    undefined;
  private _firewallInstance: FirewallResult | undefined = undefined;
  private _vnetInstance: VnetResult | undefined = undefined;
  private _natGatewayInstance: network.NatGateway | undefined = undefined;
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
    this._peeringProps.push(props);
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
        bastion: this._bastionProps
          ? {
              ...this._bastionProps!.subnet,
            }
          : undefined,
        //Gateway
        gatewaySubnet: this._vpnGatewayProps
          ? { addressPrefix: this._vpnGatewayProps.subnetSpace }
          : undefined,
      },

      //networkPeerings: peerings,
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

  private buildBastion() {
    if (!this._bastionProps || !this._vnetInstance?.bastionSubnet) return;

    Bastion({
      ...this.commonProps,
      ...this._bastionProps,
      subnetId: this._vnetInstance!.bastionSubnet.apply((s) => s!.id!),
      dependsOn: [this._vnetInstance!.vnet!],
    });
  }

  private buildPeering() {
    if (!this._peeringProps || !this._vnetInstance) return;

    this._peeringProps.forEach((p) => {
      let info: pulumi.Input<VnetInfoType> | undefined = undefined;

      if ("groupName" in p) {
        info = getVnetInfo(p.groupName);
      } else if ("vnetId" in p) {
        info = parseVnetInfoFromId(p.vnetId);
      }

      if (info)
        NetworkPeering({
          direction: p.direction ?? "Bidirectional",
          firstVnet: {
            vnetName: this._vnetInstance!.vnet.name,
            resourceGroupName: this.commonProps.group.resourceGroupName,
          },
          secondVnet: info,
        });
    });
  }

  public build(): VnetBuilderResults {
    //this.validate();
    this.buildIpAddress();
    this.buildNatGateway();
    this.buildVnet();
    this.buildFirewall();
    this.buildVpnGateway();
    this.buildBastion();
    this.buildPeering();

    return {
      publicIpAddress: this._ipAddressInstance,
      firewall: this._firewallInstance,
      vnet: this._vnetInstance!,
      natGateway: this._natGatewayInstance,
      //peerings: this._peeringInstances,
      vnpGateway: this._vnpGatewayInstance,
    };
  }
}

export default (props: VnetBuilderProps) =>
  new VnetBuilder(props) as IVnetBuilderStart;
