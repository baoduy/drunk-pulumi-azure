import IpAddressPrefix, {
  PublicIpAddressPrefixProps,
  PublicIpAddressPrefixResult,
} from "../VNet/IpAddressPrefix";
import { KeyVaultInfo, ResourceGroupInfo } from "../types";
import Firewall, { FirewallProps, FirewallResult } from "../VNet/Firewall";
import Vnet, { VnetProps, VnetResult } from "../VNet/Vnet";
import { SubnetProps } from "../VNet/Subnet";

//Vnet builder type
type VnetBuilderCommonProps = {
  name: string;
  group: ResourceGroupInfo;
  vaultInfo: KeyVaultInfo;
};

type VnetBuilderProps = VnetBuilderCommonProps & {
  subnets: SubnetCreationProps;
} & Pick<VnetProps, "addressSpaces" | "dnsServers">;

// Generic Omit type excluding specified keys
type CommonOmit<T> = Omit<T, keyof VnetBuilderCommonProps>;

type SubnetCreationProps = Record<string, Omit<SubnetProps, "name">>;
type SubnetPrefixCreationProps = { addressPrefix: string };
type BastionCreationProps = { subnet: SubnetPrefixCreationProps };
type FirewallCreationProps = {
  subnet: SubnetPrefixCreationProps & { managementAddressPrefix: string };
} & CommonOmit<Omit<FirewallProps, "outbound" | "management">>;

interface IFireWallBuilder {
  withFirewall: (props: FirewallCreationProps) => IVnetBuilder;
}

interface IGatewayFireWallBuilder extends IFireWallBuilder {
  withNatGateway: (props: PublicIpAddressPrefixProps) => IFireWallBuilder;
}

interface IVnetBuilder {
  build: () => VnetBuilderResults;
  withBastion: (props: BastionCreationProps) => IVnetBuilder;
}

type VnetBuilderResults = {};

export class VnetBuilder implements IGatewayFireWallBuilder, IVnetBuilder {
  /** The Props */
  private readonly _subnetProps: SubnetCreationProps;
  private readonly _vnetProps: Partial<VnetBuilderProps>;
  private readonly _commonProps: VnetBuilderCommonProps;
  private _gatewayProps: undefined = undefined;
  private _bastionProps: BastionCreationProps | undefined = undefined;

  // private _ipAddressProps: CommonOmit<PublicIpAddressPrefixProps> | undefined =
  //   undefined;
  private _firewallProps: FirewallCreationProps | undefined = undefined;

  /** The Instances */
  private _ipAddressInstance: PublicIpAddressPrefixResult | undefined =
    undefined;
  private _firewallInstance: FirewallResult | undefined = undefined;
  private _vnetInstance: VnetResult | undefined = undefined;

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

  public withNatGateway(
    props: CommonOmit<PublicIpAddressPrefixProps>,
  ): IFireWallBuilder {
    return this;
  }

  public withFirewall(props: FirewallCreationProps): IVnetBuilder {
    this._firewallProps = props;
    return this;
  }

  public withBastion(props: BastionCreationProps): VnetBuilder {
    this._bastionProps = props;
    return this;
  }

  /** Builders methods */
  private buildIpAddress() {
    const ipNames = [];

    if (this._gatewayProps || this._firewallProps) {
      ipNames.push("outbound");
    }
    if (this._firewallProps && this._firewallProps.sku?.tier == "Basic") {
      ipNames.push("fw-management");
    }

    this._ipAddressInstance = IpAddressPrefix({
      ...this._commonProps,
      prefixLength: ipNames.length + 2, //Reserved 2 more IpAddress
      ipAddresses: ipNames.map((n) => ({ name: n })),
      config: { version: "IPv4", allocationMethod: "Static" },
    });
  }

  private buildVnet() {
    const subnets = Object.keys(this._subnetProps).map(
      (k) =>
        ({
          name: k,
          ...this._subnetProps[k],
        }) as SubnetProps,
    );

    this._vnetInstance = Vnet({
      ...this._commonProps,
      ...this._vnetProps,
      subnets,
      features: {
        securityGroup: {
          allowOutboundInternetAccess: !Boolean(this._ipAddressInstance),
        },
        routeTable: {},

        firewall: this._firewallProps?.subnet,
        bastion: this._bastionProps?.subnet,
      },
    });
  }
  private buildFirewall() {
    if (!this._firewallProps) return;

    const publicIpAddress = this._ipAddressInstance?.addresses["outbound"];
    const managementIpAddress =
      this._ipAddressInstance?.addresses["fw-management"];
    const firewallSubnetIp = this._vnetInstance?.firewallSubnet.apply(
      (s) => s.id!,
    );
    const manageSubnetIp = this._vnetInstance?.firewallManageSubnet?.apply(
      (s) => s.id!,
    );

    if (!firewallSubnetIp || !publicIpAddress) return;

    this._firewallInstance = Firewall({
      ...this._commonProps,
      ...this._firewallProps,

      outbound: [
        {
          name: "outbound",
          subnetId: firewallSubnetIp,
          publicIpAddress,
        },
      ],
      management:
        managementIpAddress && manageSubnetIp
          ? {
              name: "management",
              publicIpAddress: managementIpAddress,
              subnetId: manageSubnetIp,
            }
          : undefined,
    });
  }

  public build(): VnetBuilderResults {
    this.buildIpAddress();
    this.buildVnet();
    this.buildFirewall();

    return {
      ipAddress: this._ipAddressInstance,
      firewall: this._firewallInstance,
      vnet: this._vnetInstance,
    };
  }
}

export default VnetBuilder;
