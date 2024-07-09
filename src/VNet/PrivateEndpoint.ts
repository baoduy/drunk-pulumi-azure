import * as network from '@pulumi/azure-native/network';
import { output } from '@pulumi/pulumi';
import { BasicArgs, PrivateLinkPropsType, ResourceInfo } from '../types';
import { parseResourceInfoFromId } from '../Common/AzureEnv';
import { getPrivateEndpointName } from '../Common';
import { PrivateDnsZoneBuilder } from '../Builder';

export type PrivateEndpointProps = Pick<PrivateLinkPropsType, 'subnetIds'> &
  Pick<BasicArgs, 'dependsOn'> & {
    resourceInfo: ResourceInfo;
    /** check the private link DNS Zone here https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns */
    privateDnsZoneName: string;
    linkServiceGroupIds: string[];
  };

export default ({
  resourceInfo,
  subnetIds,
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
          privateEndpointName: `${name}-${index}`,
          ...resourceInfo.group,
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

  output([resourceInfo.id, ipAddresses]).apply(([id, ip]) => {
    const resourceInfo = parseResourceInfoFromId(id as string);
    return PrivateDnsZoneBuilder({
      name: `${resourceInfo!.name}.${privateDnsZoneName}`,
      group: resourceInfo!.group,
      dependsOn,
    })
      .withARecord({ ipAddresses: ip as string[], recordName: '@' })
      .linkTo({ subnetIds, registrationEnabled: false })
      .build();
  });

  return endpoints;
};
