import { stack, subscriptionId } from '../Common';
import * as network from '@pulumi/azure-native/network';
import { all, Input, interpolate } from '@pulumi/pulumi';
import { ResourceInfoWithSub } from '../types';

export type PeeringDirectionType = 'Unidirectional' | 'Bidirectional';
export type PeeringOptions = {
  allowForwardedTraffic?: boolean;
  allowVirtualNetworkAccess?: boolean;
  allowGatewayTransit?: boolean;
  syncRemoteAddressSpace?: boolean;
  useRemoteGateways?: boolean;
  doNotVerifyRemoteGateways?: boolean;
};

export type VnetPeeringType = {
  vnetInfo: Input<ResourceInfoWithSub>;
  options?: PeeringOptions;
};

export interface VNetPeeringProps {
  from: VnetPeeringType;
  to: VnetPeeringType;
  direction?: PeeringDirectionType;
}

const defaultOptions: PeeringOptions = {
  allowForwardedTraffic: true,
  allowVirtualNetworkAccess: true,
  allowGatewayTransit: true,
  syncRemoteAddressSpace: true,
  doNotVerifyRemoteGateways: true,
};

export default ({
  direction = 'Unidirectional',
  from,
  to,
}: VNetPeeringProps) => {
  const firstOptions = { ...defaultOptions, ...from.options };
  const secondOptions = { ...defaultOptions, ...to.options };
  const firstVnet = from.vnetInfo;
  const secondVnet = to.vnetInfo;

  all([firstVnet, secondVnet]).apply(([first, second]) => {
    new network.VirtualNetworkPeering(
      `${stack}-${first.name}-${second.name}-vlk`,
      {
        ...firstOptions,
        syncRemoteAddressSpace: firstOptions.syncRemoteAddressSpace
          ? 'true'
          : 'false',
        virtualNetworkPeeringName: `${stack}-${first.name}-${second.name}-vlk`,
        virtualNetworkName: first.name,
        resourceGroupName: first.group.resourceGroupName,
        peeringSyncLevel: 'FullyInSync',
        remoteVirtualNetwork: {
          id: interpolate`/subscriptions/${second.subscriptionId ?? subscriptionId}/resourceGroups/${second.group.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${second.name}`,
        },
      },
      {
        deleteBeforeReplace: true,
        ignoreChanges: ['peeringSyncLevel', 'peeringState'],
      },
    );

    if (direction === 'Bidirectional')
      new network.VirtualNetworkPeering(
        `${stack}-${second.name}-${first.name}-vlk`,
        {
          ...secondOptions,
          syncRemoteAddressSpace: secondOptions.syncRemoteAddressSpace
            ? 'true'
            : 'false',
          virtualNetworkPeeringName: `${stack}-${second.name}-${first.name}-vlk`,
          virtualNetworkName: second.name,
          resourceGroupName: second.group.resourceGroupName,
          peeringSyncLevel: 'FullyInSync',
          remoteVirtualNetwork: {
            id: interpolate`/subscriptions/${first.subscriptionId ?? subscriptionId}/resourceGroups/${first.group.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${first.name}`,
          },
        },
        {
          deleteBeforeReplace: true,
          ignoreChanges: ['peeringSyncLevel', 'peeringState'],
        },
      );
  });
};
