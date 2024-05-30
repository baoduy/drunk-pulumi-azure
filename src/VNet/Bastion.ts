import { BasicResourceArgs } from "../types";
import IpAddress from "./IpAddress";
import * as network from "@pulumi/azure-native/network";
import { Input } from "@pulumi/pulumi";
import { getBastionName } from "../Common/Naming";

export interface BastionProps extends BasicResourceArgs {
  subnetId: Input<string>;
}

export default ({
  name,
  group,
  subnetId,
  dependsOn,
  importUri,
  ignoreChanges,
}: BastionProps) => {
  name = getBastionName(name);

  const ipAddressId = IpAddress({
    name,
    group,
    lock: false,
  }).id;

  return new network.BastionHost(
    name,
    {
      bastionHostName: name,
      ...group,

      ipConfigurations: [
        {
          name: "IpConfig",
          publicIPAddress: { id: ipAddressId },
          subnet: { id: subnetId },
          privateIPAllocationMethod: network.IPAllocationMethod.Dynamic,
        },
      ],
    },
    {
      dependsOn: dependsOn,
      deleteBeforeReplace: true,
      import: importUri,
      ignoreChanges,
    },
  );
};
