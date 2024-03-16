import { stack } from '../Common/StackEnv';
import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';

export interface VNetPeeringProps {
  name: string;

  localVNetName: Input<string>;
  localVNetResourceGroupName: Input<string>;

  globalPeeringVnetId: Input<string>;
}

export default ({
  name,
  localVNetName,
  localVNetResourceGroupName,
  globalPeeringVnetId,
}: VNetPeeringProps) => {
  new network.VirtualNetworkPeering(`${stack}-${name}-first-vlk`, {
    virtualNetworkPeeringName: `${stack}-${name}-first-vlk`,
    virtualNetworkName: localVNetName,
    resourceGroupName: localVNetResourceGroupName,
    allowForwardedTraffic: false,
    allowVirtualNetworkAccess: false,
    remoteVirtualNetwork: {
      id: globalPeeringVnetId,
    },
  });
};
