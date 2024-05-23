import { stack } from "../Common/StackEnv";
import * as network from "@pulumi/azure-native/network";
import { subscriptionId } from "../Common/AzureEnv";
import { Input, interpolate } from "@pulumi/pulumi";

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
  const firstPeering = new network.VirtualNetworkPeering(
    `${stack}-${name}-first-vlk`,
    {
      virtualNetworkPeeringName: `${stack}-${name}-first-vlk`,
      virtualNetworkName: firstVNetName,
      resourceGroupName: firstVNetResourceGroupName,
      allowForwardedTraffic: true,
      allowVirtualNetworkAccess: true,
      remoteVirtualNetwork: {
        id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${secondVNetResourceGroupName}/providers/Microsoft.Network/virtualNetworks/${secondVNetName}`,
      },
    },
  );

  const secondPeering = new network.VirtualNetworkPeering(
    `${stack}-${name}-second-vlk`,
    {
      virtualNetworkPeeringName: `${stack}-${name}-second-vlk`,
      virtualNetworkName: secondVNetName,
      resourceGroupName: secondVNetResourceGroupName,
      allowForwardedTraffic: true,
      allowVirtualNetworkAccess: true,
      remoteVirtualNetwork: {
        id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${firstVNetResourceGroupName}/providers/Microsoft.Network/virtualNetworks/${firstVNetName}`,
      },
    },
  );

  return { firstPeering, secondPeering };
};
