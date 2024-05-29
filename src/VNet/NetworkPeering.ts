import { stack } from "../Common/StackEnv";
import * as network from "@pulumi/azure-native/network";
import { all, Input, interpolate } from "@pulumi/pulumi";
import { VirtualNetworkPeeringArgs } from "@pulumi/azure-native/network/virtualNetworkPeering";
import { VnetInfoType } from "./types";
import { subscriptionId } from "../Common/AzureEnv";

export type PeeringDirectionType = "Unidirectional" | "Bidirectional";

export interface VNetPeeringProps {
  firstVnet: Input<VnetInfoType>;
  secondVnet: Input<VnetInfoType>;
  direction?: PeeringDirectionType;
}

export default ({
  direction = "Unidirectional",
  firstVnet,
  secondVnet,
}: VNetPeeringProps) => {
  const commonProps: Partial<VirtualNetworkPeeringArgs> = {
    allowForwardedTraffic: true,
    allowVirtualNetworkAccess: true,
    allowGatewayTransit: true,
    syncRemoteAddressSpace: "true",
    useRemoteGateways: false,
    doNotVerifyRemoteGateways: true,
  };

  all([firstVnet, secondVnet]).apply(([first, second]) => {
    new network.VirtualNetworkPeering(
      `${stack}-${first.vnetName}-${second.vnetName}-vlk`,
      {
        ...commonProps,
        virtualNetworkPeeringName: `${stack}-${first.vnetName}-${second.vnetName}-vlk`,
        virtualNetworkName: first.vnetName,
        resourceGroupName: first.resourceGroupName,
        remoteVirtualNetwork: {
          id: interpolate`/subscriptions/${second.subscriptionId ?? subscriptionId}/resourceGroups/${second.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${second.vnetName}`,
        },
      },
    );

    if (direction === "Bidirectional")
      new network.VirtualNetworkPeering(
        `${stack}-${second.vnetName}-${first.vnetName}-vlk`,
        {
          ...commonProps,
          virtualNetworkPeeringName: `${stack}-${second.vnetName}-${first.vnetName}-vlk`,
          virtualNetworkName: second.vnetName,
          resourceGroupName: second.resourceGroupName,
          remoteVirtualNetwork: {
            id: interpolate`/subscriptions/${first.subscriptionId ?? subscriptionId}/resourceGroups/${first.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${first.vnetName}`,
          },
        },
      );
  });
};
