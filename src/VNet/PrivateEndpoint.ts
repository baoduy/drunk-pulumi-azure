import * as network from "@pulumi/azure-native/network";
import { Input, output } from "@pulumi/pulumi";
import { BasicResourceArgs, PrivateLinkProps } from "../types";
import { getVnetIdFromSubnetId } from "./Helper";
import PrivateZone, { linkVnetToPrivateDns, addARecord } from "./PrivateDns";
import { parseResourceInfoFromId } from "../Common/AzureEnv";
import { getPrivateEndpointName } from "../Common/Naming";

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
    (s) =>
      new network.PrivateEndpoint(name, {
        privateEndpointName: name,
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
  ).apply((a) => a.flatMap((i) => i));

  output(resourceId).apply((id) => {
    const resourceInfo = parseResourceInfoFromId(id);

    //Create Zone
    const zone = PrivateZone({
      name: `${resourceInfo?.name}.${privateDnsZoneName}`,
      group,
    });

    //Add Root Record
    addARecord({
      ipAddresses,
      recordName: "@",
      dnsInfo: zone.toDnsInfo(),
      dependsOn: zone.resource,
    });

    //Link to Vnet
    subnetIds.map((s, index) =>
      output(s).apply((id) => {
        const vnetId = getVnetIdFromSubnetId(id);
        linkVnetToPrivateDns({
          name: `${name}-${index}`,
          zoneName: privateDnsZoneName,
          vnetId,
          group,
          dependsOn: zone.resource,
        });
      }),
    );
    //}
  });

  return endpoints;
};
