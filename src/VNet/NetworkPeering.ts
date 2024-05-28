import { stack } from "../Common/StackEnv";
import * as network from "@pulumi/azure-native/network";
import { subscriptionId } from "../Common/AzureEnv";
import { Input, interpolate } from "@pulumi/pulumi";
import { VirtualNetworkPeeringArgs } from "@pulumi/azure-native/network/virtualNetworkPeering";

export interface VNetPeeringProps {
  name: string;

  firstVNetName: Input<string>;
  firstVNetResourceGroupName: Input<string>;

  secondVNetName: Input<string>;
  secondVNetResourceGroupName: Input<string>;
}

export type NetworkPeeringResults = {
  firstPeering: network.VirtualNetworkPeering;
  secondPeering: network.VirtualNetworkPeering;
};

export default ({
  name,
  firstVNetName,
  firstVNetResourceGroupName,
  secondVNetName,
  secondVNetResourceGroupName,
}: VNetPeeringProps): NetworkPeeringResults => {
  const commonProps: Partial<VirtualNetworkPeeringArgs> = {
    allowForwardedTraffic: true,
    allowVirtualNetworkAccess: true,
    allowGatewayTransit: true,
    //syncRemoteAddressSpace: true,
    useRemoteGateways: false,
    doNotVerifyRemoteGateways: true,
  };

  const firstPeering = new network.VirtualNetworkPeering(
    `${stack}-${name}-first-vlk`,
    {
      ...commonProps,
      virtualNetworkPeeringName: `${stack}-${name}-first-vlk`,
      virtualNetworkName: firstVNetName,
      resourceGroupName: firstVNetResourceGroupName,
      remoteVirtualNetwork: {
        id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${secondVNetResourceGroupName}/providers/Microsoft.Network/virtualNetworks/${secondVNetName}`,
      },
    },
  );

  const secondPeering = new network.VirtualNetworkPeering(
    `${stack}-${name}-second-vlk`,
    {
      ...commonProps,
      virtualNetworkPeeringName: `${stack}-${name}-second-vlk`,
      virtualNetworkName: secondVNetName,
      resourceGroupName: secondVNetResourceGroupName,
      remoteVirtualNetwork: {
        id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${firstVNetResourceGroupName}/providers/Microsoft.Network/virtualNetworks/${firstVNetName}`,
      },
    },
  );

  return { firstPeering, secondPeering };
};
