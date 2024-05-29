import { stack } from "../Common/StackEnv";
import * as network from "@pulumi/azure-native/network";
import { subscriptionId } from "../Common/AzureEnv";
import { all, Input, interpolate } from "@pulumi/pulumi";
import { VirtualNetworkPeeringArgs } from "@pulumi/azure-native/network/virtualNetworkPeering";

export type PeeringDirectionType = "Unidirectional" | "Bidirectional";

export interface VNetPeeringProps {
  firstVNetName: Input<string>;
  firstVNetResourceGroupName: Input<string>;

  secondVNetName: Input<string>;
  secondVNetResourceGroupName: Input<string>;
  direction?: PeeringDirectionType;
}

export default ({
  direction = "Bidirectional",
  firstVNetName,
  firstVNetResourceGroupName,
  secondVNetName,
  secondVNetResourceGroupName,
}: VNetPeeringProps) => {
  const commonProps: Partial<VirtualNetworkPeeringArgs> = {
    allowForwardedTraffic: true,
    allowVirtualNetworkAccess: true,
    allowGatewayTransit: true,
    syncRemoteAddressSpace: "true",
    useRemoteGateways: false,
    doNotVerifyRemoteGateways: true,
  };

  all([
    firstVNetName,
    firstVNetResourceGroupName,
    secondVNetName,
    secondVNetResourceGroupName,
  ]).apply(([firstName, firstGroup, secondName, secondGroup]) => {
    new network.VirtualNetworkPeering(
      `${stack}-${firstName}-${secondName}-vlk`,
      {
        ...commonProps,
        virtualNetworkPeeringName: `${stack}-${firstName}-${secondName}-vlk`,
        virtualNetworkName: firstName,
        resourceGroupName: firstGroup,
        remoteVirtualNetwork: {
          id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${secondGroup}/providers/Microsoft.Network/virtualNetworks/${secondName}`,
        },
      },
    );

    if (direction === "Bidirectional")
      new network.VirtualNetworkPeering(
        `${stack}-${secondName}-${firstName}-vlk`,
        {
          ...commonProps,
          virtualNetworkPeeringName: `${stack}-${secondName}-${firstName}-vlk`,
          virtualNetworkName: secondName,
          resourceGroupName: secondGroup,
          remoteVirtualNetwork: {
            id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${firstGroup}/providers/Microsoft.Network/virtualNetworks/${firstName}`,
          },
        },
      );
  });
};
