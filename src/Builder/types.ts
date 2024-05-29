import { KeyVaultInfo, ResourceGroupInfo } from "../types";
import { RouteArgs, CustomSecurityRuleArgs } from "../VNet/types";
import { VnetProps, VnetResult } from "../VNet/Vnet";
import { SubnetProps } from "../VNet/Subnet";
import { Input, Resource } from "@pulumi/pulumi";
import { FirewallProps, FirewallResult } from "../VNet/Firewall";
import { VpnGatewayProps } from "../VNet/VPNGateway";
import { LogInfoResults } from "../Logs/Helpers";
import { PublicIpAddressPrefixResult } from "../VNet/IpAddressPrefix";
import * as network from "@pulumi/azure-native/network";
import { SshGenerationProps, SshResults } from "../Core/KeyGenetators";
import {
  AksAccessProps,
  AksNetworkProps,
  AksNodePoolProps,
  AksResults,
  AskAddonProps,
  AskFeatureProps,
  DefaultAksNodePoolProps,
} from "../Aks";
import * as native from "@pulumi/azure-native";
import { PeeringDirectionType } from "../VNet/NetworkPeering";

//Common Builder Types
export type CommonBuilderProps = {
  name: string;
  group: ResourceGroupInfo;
  vaultInfo: KeyVaultInfo;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
};
export type CommonOmit<T> = Omit<T, keyof CommonBuilderProps>;

//Synchronous
export interface IResourcesBuilder<TResults> {
  commonProps: CommonBuilderProps;
  build: () => TResults;
}

export abstract class ResourcesBuilder<TResults>
  implements IResourcesBuilder<TResults>
{
  protected constructor(public commonProps: CommonBuilderProps) {}
  public abstract build(): TResults;
}

//Asynchronous
export interface IResourcesBuilderAsync<TResults>
  extends Omit<IResourcesBuilder<TResults>, "build"> {
  build: () => Promise<TResults>;
}

export abstract class ResourcesBuilderAsync<TResults>
  implements IResourcesBuilderAsync<TResults>
{
  constructor(public commonProps: CommonBuilderProps) {}
  public abstract build(): Promise<TResults>;
}

//VNet Builder Types
export type VnetBuilderProps = CommonBuilderProps & {
  subnets?: SubnetCreationProps;
} & Pick<VnetProps, "addressSpaces" | "dnsServers">;
export type SubnetCreationProps = Record<string, Omit<SubnetProps, "name">>;
export type SubnetPrefixCreationProps = { addressPrefix: string };
export type BastionCreationProps = { subnet: SubnetPrefixCreationProps };
export type PeeringProps = {
  vnetName: Input<string>;
  group: ResourceGroupInfo;
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
  asHub: () => IPublicIpBuilder;
  asSpoke: () => IVnetBuilder;
}
export interface IPublicIpBuilder {
  withPublicIpAddress: (
    type: "prefix" | "individual",
  ) => IGatewayFireWallBuilder;
}

export interface IFireWallOrVnetBuilder
  extends IResourcesBuilder<VnetBuilderResults> {
  withFirewall: (props: FirewallCreationProps) => IVnetBuilder;
}

export interface IGatewayFireWallBuilder extends IFireWallOrVnetBuilder {
  withNatGateway: () => IFireWallOrVnetBuilder;
}

export interface IVnetBuilder extends IResourcesBuilder<VnetBuilderResults> {
  withBastion: (props: BastionCreationProps) => IVnetBuilder;
  peeringTo: (vnetName: string) => IVnetBuilder;
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

//AKS Builder types
export type AksBuilderProps = CommonBuilderProps & {};
export type AskBuilderResults = {
  ssh: SshResults;
  aks: AksResults;
};
export type SshBuilderProps = Omit<SshGenerationProps, "vaultInfo" | "name">;
export type AksImportProps = { id: string; ignoreChanges?: string[] };

export interface ISshBuilder {
  withNewSsh: (props: SshBuilderProps) => IAskAuthBuilder;
  //withExistingSsh: (props: {vaultSecretName:string}) => IAskAuthBuilder;
}
export interface IAskAuthBuilder {
  withAuth: (props: AksAccessProps) => IAksNetworkBuilder;
}
export interface IAksNetworkBuilder {
  withNetwork: (props: AksNetworkProps) => IAksDefaultNodePoolBuilder;
}
export interface IAksDefaultNodePoolBuilder {
  withDefaultNodePool: (props: DefaultAksNodePoolProps) => IAksBuilder;
}
export interface IAksBuilder extends IResourcesBuilderAsync<AskBuilderResults> {
  withNodePool: (props: AksNodePoolProps) => IAksBuilder;
  withAddon: (props: AskAddonProps) => IAksBuilder;
  withFeature: (props: AskFeatureProps) => IAksBuilder;
  withTier: (
    tier: native.containerservice.ManagedClusterSKUTier,
  ) => IAksBuilder;
  import: (props: AksImportProps) => IAksBuilder;
}
