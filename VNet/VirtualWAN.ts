import { BasicResourceArgs, DefaultResourceArgs } from '../types';
import * as network from '@pulumi/azure-native/network';
import { getWanName, getHubName } from '../Common/Naming';
import { Input } from '@pulumi/pulumi';
import { input as inputs } from '@pulumi/azure-native/types';
import Firewall from './Firewall';

interface Props
  extends BasicResourceArgs,
    Omit<DefaultResourceArgs, 'monitoring'> {
  /** The hub Address space */
  hubAddressPreifx: Input<string>;
  hubRoutes?: Input<
    Input<inputs.network.v20220501.VirtualHubRouteTableV2Args>[]
  >;
  firewall?: {
    create: boolean;
    subnetId: Input<string>;
    //publicIpAddressIds: Input<string>[];
  };
}

export default async ({
  name,
  group,
  hubAddressPreifx,
  hubRoutes,
  firewall,
}: Props) => {
  const wanName = getWanName(name);
  const hubName = getHubName(name);

  const wan = new network.v20220501.VirtualWan(wanName, {
    ...group,
    virtualWANName: wanName,
    allowVnetToVnetTraffic: true,
    allowBranchToBranchTraffic: false,
    type: 'Standard',
  });

  const azFirewall = firewall?.create
    ? await Firewall({
        name,
        group,
        outbound: [{ subnetId: firewall.subnetId }],
      })
    : undefined;

  const hub = new network.v20220501.VirtualHub(
    hubName,
    {
      ...group,
      virtualHubName: hubName,
      allowBranchToBranchTraffic: false,
      virtualWan: { id: wan.id },

      addressPrefix: hubAddressPreifx,
      virtualHubRouteTableV2s: hubRoutes,
      azureFirewall: azFirewall && { id: azFirewall.firewall.id },
    },
    { dependsOn: azFirewall ? [azFirewall.firewall, wan] : wan }
  );

  return { wan, hub, firewall: azFirewall };
};
