import { BasicResourceArgs } from "../types";
import IpAddress from "./IpAddress";
import * as network from "@pulumi/azure-native/network";
import { Input, Resource } from "@pulumi/pulumi";
import { getBastionName } from "../Common/Naming";
import { defaultTags } from "../Common/AzureEnv";

interface Props extends BasicResourceArgs {
  subnetId: Input<string>;
  dependsOn?: Input<Resource> | Input<Input<Resource>[]>;
}

export default ({ name, group, subnetId, dependsOn }: Props) => {
  name = getBastionName(name);

  const ipAddress = IpAddress({
    name,
    group,
    sku: { name: "Standard", tier: "Regional" },
    lock: false,
  });

  return new network.BastionHost(
    name,
    {
      bastionHostName: name,
      ...group,
      //dnsName: name,

      ipConfigurations: [
        {
          name: "IpConfig",
          publicIPAddress: { id: ipAddress.id },
          subnet: { id: subnetId },
          privateIPAllocationMethod: network.IPAllocationMethod.Dynamic,
        },
      ],

      tags: defaultTags,
    },
    { dependsOn: dependsOn || ipAddress, deleteBeforeReplace: true }
  );
};
