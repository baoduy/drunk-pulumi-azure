import IpAddressPrefix, {
  PublicIpAddressPrefixResult,
} from '../VNet/IpAddressPrefix';
import { BlockInternetSecurityRule } from '../VNet/NSGRules';
import * as network from '@pulumi/azure-native/network';
import { CustomSecurityRuleArgs, RouteArgs } from '../VNet/types';
import * as Firewall from '../VNet/Firewall';
import Vnet, { VnetResult } from '../VNet/Vnet';
import { SubnetProps } from '../VNet/Subnet';
import NatGateway from '../VNet/NatGateway';
import * as pulumi from '@pulumi/pulumi';
import { input as inputs } from '@pulumi/azure-native/types';
import NetworkPeering from '../VNet/NetworkPeering';
import VPNGateway from '../VNet/VPNGateway';
import PrivateDnsZoneBuilder from './PrivateDnsZoneBuilder';
import * as types from './types';
import Bastion from '../VNet/Bastion';
import { rsInfo } from '../Common';
import { ResourceInfo, ResourceInfoWithSub } from '../types';
import { FirewallCreationProps, IGatewayFireWallBuilder } from './types';
import { Input } from '@pulumi/pulumi';

const outboundIpName = 'outbound';

class VnetBuilder
  extends types.Builder<types.VnetBuilderResults>
  implements
  types.IGatewayFireWallBuilder,
  types.IVnetBuilder,
  types.IVnetBuilderStart {
  /** The Instances */
  private _ipAddressInstance: PublicIpAddressPrefixResult | undefined =
    undefined;
  private _firewallInstance: Firewall.FirewallResult | undefined = undefined;
  private _vnetInstance: VnetResult | undefined = undefined;
  private _natGatewayInstance: network.NatGateway | undefined = undefined;
  private _vnpGatewayInstance: network.VirtualNetworkGateway | undefined =
    undefined;
  private _privateDnsInstances: Record<string, ResourceInfo> = {};
  private _finalIpAddressIds: Input<string>[] = [];

  /** The Props */
  private _subnetProps: types.SubnetCreationProps | undefined = undefined;
  private _vnetProps: Partial<types.VnetBuilderProps> = {};
  private _firewallProps: types.FirewallCreationProps | undefined = undefined;
  private _bastionProps: types.BastionCreationProps | undefined = undefined;
  private _natGatewayEnabled?: boolean = false;
  private _vpnGatewayProps: types.VpnGatewayCreationProps | undefined =
    undefined;
  private _securityRules: CustomSecurityRuleArgs[] = [];
  private _enableSG: boolean = false;
  private _routeRules: pulumi.Input<inputs.network.RouteArgs>[] = [];
  private _enableRoute: boolean = false;
  private _peeringProps: types.PeeringProps[] = [];
  //private _logInfo: LogInfo | undefined = undefined;
  private _ipType: 'prefix' | 'individual' | 'existing' = 'individual';
  private _privateDns: Record<
    string,
    types.VnetPrivateDnsBuilderFunc | undefined
  > = {};

  constructor(private args: types.VnetBuilderArgs) {
    super(args);
  }

  public asHub(props: types.VnetBuilderProps = {}): types.IPublicIpBuilder {
    this._subnetProps = props.subnets;
    this._vnetProps = {
      dnsServers: props.dnsServers,
      addressSpaces: props.addressSpaces,
    };

    return this;
  }
  public asSpoke(props: types.VnetBuilderProps = {}): types.IVnetBuilder {
    this._subnetProps = props.subnets;
    this._vnetProps = {
      dnsServers: props.dnsServers,
      addressSpaces: props.addressSpaces,
    };

    return this;
  }

  public withPublicIP(
    type: 'prefix' | 'individual',
  ): types.IGatewayFireWallBuilder {
    this._ipType = type;
    return this;
  }

  public withPublicIPFrom(id: Input<string>): IGatewayFireWallBuilder {
    this._finalIpAddressIds.push(id);
    this._ipType = 'existing';
    return this;
  }

  public withNatGateway(): types.IVnetBuilder {
    this._natGatewayEnabled = true;
    return this;
  }

  public withVpnGateway(
    props: types.VpnGatewayCreationProps,
  ): types.IVnetBuilder {
    this._vpnGatewayProps = props;
    return this;
  }

  public withFirewall(props: types.FirewallCreationProps): types.IVnetBuilder {
    this._firewallProps = props;
    return this;
  }

  public withFirewallAndNatGateway(
    props: FirewallCreationProps,
  ): types.IVnetBuilder {
    this.withFirewall(props);
    return this.withNatGateway();
  }

  public withBastion(props: types.BastionCreationProps): types.IVnetBuilder {
    this._bastionProps = props;
    return this;
  }

  public withSecurityRules(
    ...rules: CustomSecurityRuleArgs[]
  ): types.IVnetBuilder {
    this._securityRules.push(...rules);
    this._enableSG = true;
    return this;
  }

  public withRouteRules(...rules: RouteArgs[]): types.IVnetBuilder {
    this._routeRules.push(...rules);
    this._enableRoute = true;
    return this;
  }
  public withPrivateDns(
    domain: string,
    builder?: types.VnetPrivateDnsBuilderFunc,
  ): types.IVnetBuilder {
    this._privateDns[domain] = builder;
    return this;
  }

  public peeringTo(props: types.PeeringProps): types.IVnetBuilder {
    this._peeringProps.push(props);
    return this;
  }

  // public withLogInfo(info: LogInfo): types.IVnetBuilder {
  //   this._logInfo = info;
  //   return this;
  // }

  /** Builders methods */
  private buildIpAddress() {
    //IP Address Already provided
    if (this._ipType === 'existing') return;

    const ipNames = new Array<string>();
    //No gateway and no firewall then Do nothing
    if (!this._natGatewayEnabled && !this._firewallProps) return;

    //Add outbound Ipaddress for Firewall alone
    if (this._natGatewayEnabled || this._firewallProps) {
      ipNames.push(outboundIpName);
    }

    //Create IpPrefix
    this._ipAddressInstance = IpAddressPrefix({
      ...this.commonProps,
      ipAddresses: ipNames.map((n) => ({ name: n })),
      createPrefix: this._ipType === 'prefix',
      config: { version: 'IPv4', allocationMethod: 'Static' },
      retainOnDelete: true,
    });

    //Collect All IpAddresses
    if (this._ipAddressInstance.addresses) {
      Object.values(this._ipAddressInstance.addresses).forEach((ip) =>
        this._finalIpAddressIds.push(ip.id),
      );
    }
  }

  private buildNatGateway() {
    if (!this._natGatewayEnabled) return;

    this._natGatewayInstance = NatGateway({
      ...this.commonProps,

      publicIpAddresses: this._finalIpAddressIds,
      publicIpPrefixes: this._ipAddressInstance?.addressPrefix
        ? [this._ipAddressInstance.addressPrefix!.id]
        : undefined,
    });
  }

  private buildVnet() {
    if (!this._firewallProps) {
      this.withSecurityRules(
        ...BlockInternetSecurityRule(this.commonProps.name),
      );
    }

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
          enabled: this._enableSG,
          allowOutboundInternetAccess:
            !this._ipAddressInstance && !this._natGatewayEnabled,
          rules: this._securityRules,
        },
        //Route tables
        routeTable: {
          enabled: this._enableRoute,
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
            ...this._bastionProps.subnet,
          }
          : undefined,
        //Gateway
        gatewaySubnet: this._vpnGatewayProps
          ? { addressPrefix: this._vpnGatewayProps.subnetSpace }
          : undefined,
      },

      //networkPeerings: peerings,
      dependsOn: this._firewallInstance?.instance
        ? this._firewallInstance.instance
        : (this._natGatewayInstance ?? this.commonProps.dependsOn),
    });
  }

  private buildFirewall() {
    if (!this._firewallProps) return;

    const firewallSubnetId = this._vnetInstance?.firewallSubnet?.apply(
      (s) => s?.id!,
    );
    const manageSubnetId = this._vnetInstance?.firewallManageSubnet?.apply(
      (s) => s?.id!,
    );

    this._firewallInstance = Firewall.create({
      ...this.commonProps,
      ...this._firewallProps,

      outbound: [
        {
          subnetId: firewallSubnetId!,
          //Using Force Tunneling mode if Nat gateway is enabled.
          publicIpAddressId: this._natGatewayEnabled
            ? undefined
            : this._finalIpAddressIds[0],
        },
      ],
      //This is required for Force Tunneling mode
      management: manageSubnetId
        ? {
          subnetId: manageSubnetId,
        }
        : undefined,

      logInfo: this.args.logInfo,
      dependsOn:
        this._ipAddressInstance?.addressPrefix ??
        (this._ipAddressInstance?.addresses
          ? Object.values(this._ipAddressInstance.addresses)
          : undefined),
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
      subnetId: this._vnetInstance.bastionSubnet.apply((s) => s!.id!),
      dependsOn: this._vnetInstance.vnet,
    });
  }

  private buildPrivateDns() {
    Object.keys(this._privateDns).forEach((k) => {
      const bFunc = this._privateDns[k];
      const builder = PrivateDnsZoneBuilder({
        ...this.commonProps,
        name: k,
      }).linkTo({
        vnetIds: [this._vnetInstance!.id],
      });

      if (bFunc) bFunc(builder);
      this._privateDnsInstances[k] = builder.build();
    });
  }

  private buildPeering() {
    if (!this._peeringProps || !this._vnetInstance) return;

    this._peeringProps.forEach((p) => {
      let info: pulumi.Input<ResourceInfoWithSub> | undefined = undefined;

      if ('groupName' in p) {
        info = rsInfo.getVnetInfo(p.groupName);
      } else if ('vnetId' in p) {
        info = pulumi
          .output(p.vnetId)
          .apply((id) => rsInfo.getResourceInfoFromId(id)!);
      }

      if (info)
        NetworkPeering({
          direction: p.direction ?? 'Bidirectional',
          from: {
            options: p.options,
            vnetInfo: {
              name: this._vnetInstance!.name,
              group: this.commonProps.group,
              id: this._vnetInstance!.id,
            },
          },
          to: { vnetInfo: info },
        });
    });
  }

  public build(): types.VnetBuilderResults {
    //this.validate();
    this.buildIpAddress();
    this.buildNatGateway();
    this.buildVnet();
    this.buildFirewall();
    this.buildVpnGateway();
    this.buildBastion();
    this.buildPrivateDns();
    this.buildPeering();

    return {
      ...this._vnetInstance!,
      publicIpAddress: this._ipAddressInstance,
      firewall: this._firewallInstance,
      natGateway: this._natGatewayInstance,
      //peerings: this._peeringInstances,
      vnpGateway: this._vnpGatewayInstance,
    };
  }
}

export default (props: types.VnetBuilderArgs) =>
  new VnetBuilder(props) as types.IVnetBuilderStart;
