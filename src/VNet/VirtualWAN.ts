import { BasicResourceArgs, DefaultResourceArgs } from "../types";
import * as network from "@pulumi/azure-native/network";
import { getHubName, getWanName } from "../Common/Naming";
import { Input } from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/azure-native/types";
import Firewall from "./Firewall";
import { FirewallPolicyProps } from "./types";

interface Props
  extends BasicResourceArgs,
    Omit<DefaultResourceArgs, "monitoring"> {
  /** The hub Address space */
  hubAddressPrefix: Input<string>;
  hubRoutes?: Input<Input<inputs.network.VirtualHubRouteTableV2Args>[]>;
  firewall?: {
    create: boolean;
    subnetId: Input<string>;
    publicIpAddress: network.PublicIPAddress;
    policy: FirewallPolicyProps;
  };
}

export default ({
  name,
  group,
  hubAddressPrefix,
  hubRoutes,
  firewall,
}: Props) => {
  const wanName = getWanName(name);
  const hubName = getHubName(name);

  const wan = new network.VirtualWan(wanName, {
    ...group,
    virtualWANName: wanName,
    allowVnetToVnetTraffic: true,
    allowBranchToBranchTraffic: false,
    type: "Standard",
  });

  const azFirewall = firewall?.create
    ? Firewall({
        name,
        group,
        policy: firewall.policy,
        outbound: [
          {
            subnetId: firewall.subnetId,
            publicIpAddress: firewall.publicIpAddress,
          },
        ],
      })
    : undefined;

  const hub = new network.VirtualHub(
    hubName,
    {
      ...group,
      virtualHubName: hubName,
      allowBranchToBranchTraffic: false,
      virtualWan: { id: wan.id },

      addressPrefix: hubAddressPrefix,
      virtualHubRouteTableV2s: hubRoutes,
      azureFirewall: azFirewall && { id: azFirewall.firewall.id },
    },
    { dependsOn: azFirewall ? [azFirewall.firewall, wan] : wan },
  );

  return { wan, hub, firewall: azFirewall };
};
