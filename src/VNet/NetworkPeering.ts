import { stack, subscriptionId } from '../Common';
import * as network from '@pulumi/azure-native/network';
import { all, Input, interpolate } from '@pulumi/pulumi';
import { VirtualNetworkPeeringArgs } from '@pulumi/azure-native/network/virtualNetworkPeering';
import { ResourceInfoWithSub } from '../types';

export type PeeringDirectionType = 'Unidirectional' | 'Bidirectional';

export interface VNetPeeringProps {
  firstVnet: Input<ResourceInfoWithSub>;
  secondVnet: Input<ResourceInfoWithSub>;
  direction?: PeeringDirectionType;
}

export default ({
  direction = 'Unidirectional',
  firstVnet,
  secondVnet,
}: VNetPeeringProps) => {
  const commonProps: Partial<VirtualNetworkPeeringArgs> = {
    allowForwardedTraffic: true,
    allowVirtualNetworkAccess: true,
    allowGatewayTransit: true,
    syncRemoteAddressSpace: 'true',
    useRemoteGateways: false,
    doNotVerifyRemoteGateways: true,
  };

  all([firstVnet, secondVnet]).apply(([first, second]) => {
    new network.VirtualNetworkPeering(
      `${stack}-${first.name}-${second.name}-vlk`,
      {
        ...commonProps,
        virtualNetworkPeeringName: `${stack}-${first.name}-${second.name}-vlk`,
        virtualNetworkName: first.name,
        resourceGroupName: first.group.resourceGroupName,
        remoteVirtualNetwork: {
          id: interpolate`/subscriptions/${second.subscriptionId ?? subscriptionId}/resourceGroups/${second.group.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${second.name}`,
        },
      },
      { deleteBeforeReplace: true },
    );

    if (direction === 'Bidirectional')
      new network.VirtualNetworkPeering(
        `${stack}-${second.name}-${first.name}-vlk`,
        {
          ...commonProps,
          virtualNetworkPeeringName: `${stack}-${second.name}-${first.name}-vlk`,
          virtualNetworkName: second.name,
          resourceGroupName: second.group.resourceGroupName,
          remoteVirtualNetwork: {
            id: interpolate`/subscriptions/${first.subscriptionId ?? subscriptionId}/resourceGroups/${first.group.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${first.name}`,
          },
        },
        { deleteBeforeReplace: true },
      );
  });
};
