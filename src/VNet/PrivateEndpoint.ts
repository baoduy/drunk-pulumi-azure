import * as network from '@pulumi/azure-native/network';
import { output } from '@pulumi/pulumi';
import { OptsArgs, PrivateLinkPropsType, ResourceInfo } from '../types';
import { getPrivateEndpointName, rsInfo } from '../Common';
import { PrivateDnsZoneBuilder } from '../Builder';

export type PrivateEndpointProps = Omit<PrivateLinkPropsType, 'type'> &
  Pick<OptsArgs, 'dependsOn'> & {
    resourceInfo: ResourceInfo;
    /** check the private link DNS Zone here https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns */
    privateDnsZoneName: string;
    linkServiceGroupIds: string[];
  };

export default ({
  resourceInfo,
  subnetIds,
  extraVnetIds,
  privateDnsZoneName,
  linkServiceGroupIds,
  dependsOn,
}: PrivateEndpointProps) => {
  const name = getPrivateEndpointName(resourceInfo.name);

  const endpoints = output(subnetIds).apply((ss) =>
    ss.map((s) => {
      const n = rsInfo.getNameFromId(s);
      const ep = new network.PrivateEndpoint(
        `${name}-${n}`,
        {
          ...resourceInfo.group,
          privateEndpointName: `${name}-${n}`,
          subnet: { id: s },
          privateLinkServiceConnections: [
            {
              groupIds: linkServiceGroupIds,
              name: `${name}-conn`,
              privateLinkServiceId: resourceInfo.id,
            },
          ],
        },
        { dependsOn },
      );

      return {
        instance: ep,
        ipAddresses: ep.customDnsConfigs.apply((c) =>
          c!.flatMap((i) => i!.ipAddresses!),
        ),
      };
    }),
  );

  //Get IpAddress in
  const ipAddresses = output(endpoints).apply((a) =>
    a.flatMap((i) => i.ipAddresses!),
  );

  output(ipAddresses).apply((ip) =>
    PrivateDnsZoneBuilder({
      name: `${resourceInfo!.name}.${privateDnsZoneName}`,
      group: resourceInfo!.group,
      dependsOn,
    })
      .withARecord({ ipAddresses: ip, recordName: '@' })
      .linkTo({ subnetIds, vnetIds: extraVnetIds })
      .build(),
  );

  return endpoints;
};
