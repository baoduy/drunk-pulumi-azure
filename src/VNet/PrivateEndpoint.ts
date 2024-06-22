import * as network from "@pulumi/azure-native/network";
import { Input, output } from "@pulumi/pulumi";
import { BasicResourceArgs, PrivateLinkProps } from "../types";
import { getVnetIdFromSubnetId } from "./Helper";
import { parseResourceInfoFromId } from "../Common/AzureEnv";
import { getPrivateEndpointName } from "../Common/Naming";
import { PrivateDnsZoneBuilder } from "../Builder";

interface Props extends BasicResourceArgs, PrivateLinkProps {
  resourceId: Input<string>;
  privateDnsZoneName: string;
  linkServiceGroupIds: string[];
}

export default ({
  name,
  group,
  resourceId,
  subnetIds,
  privateDnsZoneName,
  linkServiceGroupIds,
}: Props) => {
  name = getPrivateEndpointName(name);

  const endpoints = subnetIds.map(
    (s, index) =>
      new network.PrivateEndpoint(`${name}-${index}`, {
        privateEndpointName: `${name}-${index}`,
        ...group,

        subnet: { id: s },
        privateLinkServiceConnections: [
          {
            groupIds: linkServiceGroupIds,
            name: `${name}-conn`,
            privateLinkServiceId: resourceId,
          },
        ],
      }),
  );

  //Get IpAddress in
  const ipAddresses = output(
    endpoints.map((e) =>
      e.customDnsConfigs.apply((c) => c!.flatMap((i) => i.ipAddresses!)),
    ),
  ).apply((a) => a.flatMap((i) => i!));

  output([resourceId, ipAddresses]).apply(([id, ip]) => {
    const resourceInfo = parseResourceInfoFromId(id as string);
    return PrivateDnsZoneBuilder({
      name: `${resourceInfo!.name}.${privateDnsZoneName}`,
      group,
    })
      .withARecord({ ipAddresses: ip as string[], recordName: "@" })
      .linkTo({ subnetIds })
      .build();
  });

  return endpoints;
};
