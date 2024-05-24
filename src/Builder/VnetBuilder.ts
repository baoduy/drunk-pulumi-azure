import IpAddressPrefix, {
  PublicIpAddressPrefixResult,
} from "../VNet/IpAddressPrefix";
import * as network from "@pulumi/azure-native/network";
import {
  CustomSecurityRuleArgs,
  KeyVaultInfo,
  ResourceGroupInfo,
  RouteArgs,
} from "../types";
import Firewall, { FirewallProps, FirewallResult } from "../VNet/Firewall";
import Vnet, { VnetProps, VnetResult } from "../VNet/Vnet";
import { SubnetProps } from "../VNet/Subnet";
import NatGateway from "../VNet/NatGateway";
import * as pulumi from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/azure-native/types";
import { Input } from "@pulumi/pulumi";
import NetworkPeering, { NetworkPeeringResults } from "../VNet/NetworkPeering";
import { LogInfoResults } from "../Logs/Helpers";

//Vnet builder type
type VnetBuilderCommonProps = {
  name: string;
  group: ResourceGroupInfo;
  vaultInfo: KeyVaultInfo;
};

type VnetBuilderProps = VnetBuilderCommonProps & {
  subnets?: SubnetCreationProps;
} & Pick<VnetProps, "addressSpaces" | "dnsServers">;

// Generic Omit type excluding specified keys
type CommonOmit<T> = Omit<T, keyof VnetBuilderCommonProps>;
type SubnetCreationProps = Record<string, Omit<SubnetProps, "name">>;
type SubnetPrefixCreationProps = { addressPrefix: string };
type BastionCreationProps = { subnet: SubnetPrefixCreationProps };
type PeeringProps = { vnetName: Input<string>; group: ResourceGroupInfo };
type FirewallCreationProps = {
  subnet: SubnetPrefixCreationProps & { managementAddressPrefix: string };
} & CommonOmit<Omit<FirewallProps, "outbound" | "management">>;

interface IFireWallOrVnetBuilder {
  withFirewall: (props: FirewallCreationProps) => IVnetBuilder;
  build: () => VnetBuilderResults;
}

interface IGatewayFireWallBuilder extends IFireWallOrVnetBuilder {
  withNatGateway: () => IFireWallOrVnetBuilder;
}

interface IVnetBuilder {
  build: () => VnetBuilderResults;
  withBastion: (props: BastionCreationProps) => IVnetBuilder;
  peeringTo: (props: PeeringProps) => IVnetBuilder;
  withSecurityRules: (rules: CustomSecurityRuleArgs[]) => IVnetBuilder;
  withRouteRules: (rules: RouteArgs[]) => IVnetBuilder;
  withLogInfo: (info: LogInfoResults) => IVnetBuilder;
}

type VnetBuilderResults = {
  publicIpAddress: PublicIpAddressPrefixResult | undefined;
  firewall: FirewallResult | undefined;
  vnet: VnetResult | undefined;
  natGateway: network.NatGateway | undefined;
};

const outboundIpName = "outbound";

export class VnetBuilder implements IGatewayFireWallBuilder, IVnetBuilder {
  /** The Props */
  private readonly _subnetProps: SubnetCreationProps | undefined = undefined;
  private readonly _vnetProps: Partial<VnetBuilderProps>;
  private readonly _commonProps: VnetBuilderCommonProps;
  private _firewallProps: FirewallCreationProps | undefined = undefined;
  private _bastionProps: BastionCreationProps | undefined = undefined;
  private _natGatewayEnabled?: boolean = false;
  private _securityRules: CustomSecurityRuleArgs[] | undefined = undefined;
  private _routeRules: pulumi.Input<inputs.network.RouteArgs>[] | undefined =
    undefined;
  private _peeringProps: PeeringProps | undefined = undefined;
  private _logInfo: LogInfoResults | undefined = undefined;

  /** The Instances */
  private _ipAddressInstance: PublicIpAddressPrefixResult | undefined =
    undefined;
  private _firewallInstance: FirewallResult | undefined = undefined;
  private _vnetInstance: VnetResult | undefined = undefined;
  private _natGatewayInstance: network.NatGateway | undefined = undefined;
  private _peeringInstance: NetworkPeeringResults | undefined = undefined;

  constructor({
    subnets,
    dnsServers,
    addressSpaces,
    ...commonProps
  }: VnetBuilderProps) {
    this._subnetProps = subnets;
    this._vnetProps = { dnsServers, addressSpaces };
    this._commonProps = commonProps;
  }

  public withNatGateway(): IFireWallOrVnetBuilder {
    this._natGatewayEnabled = true;
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
      console.log(`${this._commonProps.name}: outbound ip will be created.`);
      ipNames.push(outboundIpName);
    }

    //Create IpPrefix
    this._ipAddressInstance = IpAddressPrefix({
      ...this._commonProps,
      ipAddresses: ipNames.map((n) => ({ name: n })),
      config: { version: "IPv4", allocationMethod: "Static" },
    });
  }

  private buildNatGateway() {
    if (!this._natGatewayEnabled || !this._ipAddressInstance) return;

    const addressNames = Object.keys(this._ipAddressInstance.addresses);

    this._natGatewayInstance = NatGateway({
      ...this._commonProps,

      publicIpAddresses:
        addressNames.length > 0
          ? addressNames.map((k) => this._ipAddressInstance!.addresses![k].id)
          : undefined,

      publicIpPrefixes:
        addressNames.length <= 0 && this._ipAddressInstance.addressPrefix
          ? [this._ipAddressInstance.addressPrefix.id]
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
      ...this._commonProps,
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
      ...this._commonProps,
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

  private buildPeering() {
    if (!this._peeringProps || !this._vnetInstance) return;

    this._peeringInstance = NetworkPeering({
      name: this._commonProps.name,
      firstVNetName: this._vnetInstance.vnet.name,
      firstVNetResourceGroupName: this._commonProps.group.resourceGroupName,
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
    this.buildPeering();

    return {
      publicIpAddress: this._ipAddressInstance,
      firewall: this._firewallInstance,
      vnet: this._vnetInstance!,
      natGateway: this._natGatewayInstance,
    };
  }
}

export default VnetBuilder;
