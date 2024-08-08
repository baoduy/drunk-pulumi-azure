import * as network from '@pulumi/azure-native/network';
import { output } from '@pulumi/pulumi';
import { OptsArgs, PrivateLinkPropsType, ResourceInfo } from '../types';
import { getPrivateEndpointName } from '../Common';
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

  const endpoints = subnetIds.map(
    (s, index) =>
      new network.PrivateEndpoint(
        `${name}-${index}`,
        {
          ...resourceInfo.group,
          privateEndpointName: `${name}-${index}`,
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
      ),
  );

  //Get IpAddress in
  const ipAddresses = output(
    endpoints.map((e) =>
      e.customDnsConfigs.apply((c) => c!.flatMap((i) => i.ipAddresses!)),
    ),
  ).apply((a) => a.flatMap((i) => i!));

  output(ipAddresses).apply((ip) =>
    PrivateDnsZoneBuilder({
      name: `${resourceInfo!.name}.${privateDnsZoneName}`,
      group: resourceInfo!.group,
      dependsOn,
    })
      .withARecord({ ipAddresses: ip, recordName: '@' })
      .linkTo({ subnetIds, vnetIds: extraVnetIds, registrationEnabled: false })
      .build(),
  );

  return endpoints;
};
