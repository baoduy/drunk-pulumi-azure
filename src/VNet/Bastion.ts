import { BasicResourceArgs } from "../types";
import IpAddress from "./IpAddress";
import * as network from "@pulumi/azure-native/network";
import { Input, Resource } from "@pulumi/pulumi";
import { getBastionName } from "../Common/Naming";

interface Props extends BasicResourceArgs {
  subnetId: Input<string>;
  dependsOn?: Input<Resource> | Input<Input<Resource>[]>;
}

export default ({ name, group, subnetId, dependsOn }: Props) => {
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
    { dependsOn: dependsOn, deleteBeforeReplace: true },
  );
};
