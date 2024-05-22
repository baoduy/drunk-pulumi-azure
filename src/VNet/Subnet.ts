import * as pulumi from "@pulumi/pulumi";
import { ResourceGroupInfo } from "../types";
import * as network from "@pulumi/azure-native/network";
import { DelegateServices } from "./Vnet";

const defaultServicesEndpoints = [
  "Microsoft.AzureActiveDirectory",
  "Microsoft.AzureCosmosDB",
  "Microsoft.ContainerRegistry",
  "Microsoft.EventHub",
  "Microsoft.KeyVault",
  "Microsoft.ServiceBus",
  "Microsoft.Sql",
  "Microsoft.Storage",
  "Microsoft.Web",
];

export interface SubnetProps {
  /** The index of prefixSpaces*/
  addressPrefix: string;
  allowedServiceEndpoints?: boolean | string[];
  delegateServices?: DelegateServices[];
  /** Enable this to allow linking private endpoint network policies */
  enablePrivateEndpoint?: boolean;
  /** Enable this to allow linking private link service network policies*/
  enablePrivateLinkService?: boolean;
  enableRouteTable?: boolean;
  enableSecurityGroup?: boolean;
  /** link Nat gateway into this subnet */
  enableNatGateway?: boolean;
  name: string;
}

interface Props {
  subnet: SubnetProps;
  vnetName: pulumi.Input<string>;
  group: ResourceGroupInfo;
  securityGroup?: network.NetworkSecurityGroup;
  routeTable?: network.RouteTable;
  natGateway?: network.NatGateway;
}

export default ({
  group,
  subnet,
  vnetName,
  routeTable,
  natGateway,
  securityGroup,
}: Props): network.SubnetArgs => {
  const serviceEndpoints = Array.isArray(subnet.allowedServiceEndpoints)
    ? subnet.allowedServiceEndpoints
    : subnet.allowedServiceEndpoints === true
      ? defaultServicesEndpoints
      : undefined;

  return {
    name: subnet.name,
    subnetName: subnet.name,
    ...group,
    addressPrefix: subnet.addressPrefix,
    virtualNetworkName: vnetName,
    networkSecurityGroup: securityGroup ? { id: securityGroup.id } : undefined,
    natGateway: natGateway ? { id: natGateway.id } : undefined,

    routeTable:
      subnet.enableRouteTable !== false && routeTable
        ? { id: routeTable.id }
        : undefined,

    privateLinkServiceNetworkPolicies: subnet.enablePrivateLinkService
      ? network.VirtualNetworkPrivateLinkServiceNetworkPolicies.Enabled
      : network.VirtualNetworkPrivateLinkServiceNetworkPolicies.Disabled,

    privateEndpointNetworkPolicies: subnet.enablePrivateEndpoint
      ? network.VirtualNetworkPrivateEndpointNetworkPolicies.Enabled
      : network.VirtualNetworkPrivateEndpointNetworkPolicies.Disabled,

    serviceEndpoints: serviceEndpoints
      ? serviceEndpoints.map((service) => ({ service }))
      : undefined,

    delegations: subnet.delegateServices
      ? subnet.delegateServices.map((d) => ({
          name: `${subnet.name}-${d.split("/").pop()}-delegate`,
          serviceName: d,
        }))
      : undefined,
  };
};
