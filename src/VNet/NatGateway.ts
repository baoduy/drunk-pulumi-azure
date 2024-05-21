import * as network from "@pulumi/azure-native/network";
import { BasicResourceArgs } from "../types";
import { Input } from "@pulumi/pulumi";
import { getAppGatewayName, getNatGatewayName } from "../Common/Naming";
import subnet from "./Subnet";
import { isPrd } from "../Common/AzureEnv";

interface NatGatewayProps extends BasicResourceArgs {
  /** the list of public ip address IDs */
  publicIpAddresses: Input<string>[];
  /** the list of public ip address prefix IDs */
  publicIpPrefixes?: Input<string>[];
  /** the list subnet IDs want to be linked to Nat gateway.*/
  subnets?: Input<string>[];
}

export default ({
  name,
  group,
  publicIpPrefixes,
  publicIpAddresses,
  subnets,
  dependsOn,
}: NatGatewayProps) => {
  name = getNatGatewayName(name);
  const natGateway = new network.NatGateway(
    name,
    {
      ...group,
      natGatewayName: name,
      publicIpAddresses: publicIpAddresses.map((id) => ({ id })),
      publicIpPrefixes: publicIpPrefixes?.map((id) => ({ id })),
      subnets: subnets?.map((id) => ({ id })),
      zones: isPrd ? ["1", "2", "3"] : undefined,
      sku: {
        name: network.NatGatewaySkuName.Standard,
      },
    },
    { dependsOn },
  );

  if (subnets) {
    network.As;
  }
  return natGateway;
};
