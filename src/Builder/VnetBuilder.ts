import IpAddressPrefix, {
  PublicIpAddressPrefixResult,
} from "../VNet/IpAddressPrefix";
import * as network from "@pulumi/azure-native/network";
import { KeyVaultInfo, ResourceGroupInfo } from "../types";
import Firewall, { FirewallProps, FirewallResult } from "../VNet/Firewall";
import Vnet, { VnetProps, VnetResult } from "../VNet/Vnet";
import { SubnetProps } from "../VNet/Subnet";
import NatGateway from "../VNet/NatGateway";
import * as pulumi from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/azure-native/types";
import { isDryRun } from "../Common/StackEnv";

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
  withSecurityRules: (
    ...rules: pulumi.Input<inputs.network.SecurityRuleArgs>[]
  ) => IVnetBuilder;
  withRouteRules: (
    ...rules: pulumi.Input<inputs.network.RouteArgs>[]
  ) => IVnetBuilder;
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
  //private _gatewayProps: undefined = undefined;
  private _bastionProps: BastionCreationProps | undefined = undefined;
  private _natGatewayEnabled?: boolean = false;
  private _securityRules:
    | pulumi.Input<inputs.network.SecurityRuleArgs>[]
    | undefined = undefined;
  private _routeRules: pulumi.Input<inputs.network.RouteArgs>[] | undefined =
    undefined;

  /** The Instances */
  private _ipAddressInstance: PublicIpAddressPrefixResult | undefined =
    undefined;
  private _firewallInstance: FirewallResult | undefined = undefined;
  private _vnetInstance: VnetResult | undefined = undefined;
  private _natGatewayInstance: network.NatGateway | undefined = undefined;

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

  public withSecurityRules(
    ...rules: pulumi.Input<inputs.network.SecurityRuleArgs>[]
  ): IVnetBuilder {
    this._securityRules = rules;
    return this;
  }

  public withRouteRules(
    ...rules: pulumi.Input<inputs.network.RouteArgs>[]
  ): IVnetBuilder {
    this._routeRules = rules;
    return this;
  }

  /** Builders methods */
  private validate() {
    if (this._firewallProps) {
      if (!this._firewallProps.sku)
        this._firewallProps.sku = this._natGatewayEnabled
          ? { tier: "Standard", name: "AZFW_VNet" }
          : { tier: "Basic", name: "AZFW_VNet" };

      if (this._natGatewayEnabled && this._firewallProps.sku.tier === "Basic")
        throw new Error(
          'The Firewall tier "Basic" is not support Nat Gateway.',
        );
    }
  }

  private buildIpAddress() {
    const ipNames = [];

    if (!this._natGatewayEnabled && this._firewallProps) {
      console.log(`${this._commonProps.name}: outbound ip will be created.`);
      ipNames.push(outboundIpName);
    }

    this._ipAddressInstance = IpAddressPrefix({
      ...this._commonProps,
      ipAddresses: ipNames.map((n) => ({ name: n })),
      config: { version: "IPv4", allocationMethod: "Static" },
    });
  }

  private buildNatGateway() {
    if (!this._natGatewayEnabled || !this._ipAddressInstance) return;

    // const publicIpAddress = this._ipAddressInstance.addresses["outbound"];
    // if (!publicIpAddress) return;

    this._natGatewayInstance = NatGateway({
      ...this._commonProps,

      publicIpAddresses: this._ipAddressInstance.addresses
        ? Object.keys(this._ipAddressInstance.addresses).map(
            (k) => this._ipAddressInstance!.addresses![k].id,
          )
        : undefined,

      publicIpPrefixes:
        !this._ipAddressInstance.addresses &&
        this._ipAddressInstance.addressPrefix
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
        securityGroup: !this._firewallProps
          ? {
              allowOutboundInternetAccess:
                !Boolean(this._ipAddressInstance) && !this._natGatewayEnabled,
              rules: this._securityRules,
            }
          : undefined,

        routeTable: { rules: this._routeRules },

        firewall: this._firewallProps
          ? {
              ...this._firewallProps.subnet,
              enableNatGateway: this._natGatewayEnabled,
            }
          : undefined,

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
    const firewallSubnetId = this._vnetInstance?.firewallSubnet.apply(
      (s) => s.id!,
    );
    const manageSubnetId = this._vnetInstance?.firewallManageSubnet?.apply(
      (s) => s.id!,
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

      dependsOn: this._ipAddressInstance?.addressPrefix,
    });
  }

  public build(): VnetBuilderResults {
    this.validate();
    this.buildIpAddress();
    this.buildNatGateway();
    this.buildVnet();
    this.buildFirewall();

    return {
      publicIpAddress: this._ipAddressInstance,
      firewall: this._firewallInstance,
      vnet: this._vnetInstance,
      natGateway: this._natGatewayInstance,
    };
  }
}

export default VnetBuilder;
