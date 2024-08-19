import * as network from '@pulumi/azure-native/network';
import { CustomResource, output } from '@pulumi/pulumi';
import {
  OptsArgs,
  PrivateLinkPropsType,
  ResourceInfo,
  WithDependsOn,
} from '../types';
import { naming, rsInfo } from '../Common';
import { PrivateDnsZoneBuilder } from '../Builder';
import { StorageEndpointTypes } from '../Storage';

export type PrivateEndpointProps = PrivateLinkPropsType &
  Pick<OptsArgs, 'dependsOn'> & {
    resourceInfo: ResourceInfo;
    /** check the private link DNS Zone here https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns */
    privateDnsZoneName: string;
    /** check here for details group https://blog.blksthl.com/2023/03/22/the-complete-list-of-groupids-for-private-endpoint-privatelink-service-connection/*/
    linkServiceGroupIds: string[];
  };

const create = ({
  resourceInfo,
  subnetIds,
  extraVnetIds,
  privateDnsZoneName,
  linkServiceGroupIds,
  privateIpAddress,
  dependsOn,
}: PrivateEndpointProps) => {
  const name = naming.getPrivateEndpointName(resourceInfo.name);

  const endpoints = output(subnetIds).apply((ss) =>
    ss.map((s) => {
      const n = rsInfo.getNameFromId(s);
      const ep = new network.PrivateEndpoint(
        `${name}-${n}`,
        {
          ...resourceInfo.group,
          privateEndpointName: `${name}-${n}`,
          subnet: { id: s },
          customDnsConfigs: privateIpAddress
            ? [
                {
                  ipAddresses: [privateIpAddress],
                },
              ]
            : undefined,
          ipConfigurations: privateIpAddress
            ? [
                {
                  name: `${name}-ipconfig`,
                  groupId: linkServiceGroupIds[0],
                  memberName: linkServiceGroupIds[0],
                  privateIPAddress: privateIpAddress,
                },
              ]
            : undefined,
          privateLinkServiceConnections: [
            {
              name: `${name}-conn`,
              groupIds: linkServiceGroupIds,
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

export type ResourceLinkType = PrivateLinkPropsType &
  WithDependsOn & {
    resourceInfo: ResourceInfo;
  };

export const StoragePrivateLink = (
  type: StorageEndpointTypes | string,
  props: ResourceLinkType,
) =>
  create({
    ...props,
    privateDnsZoneName: `privatelink.${type}.core.windows.net`,
    linkServiceGroupIds: [type],
  });

const linkConfig = {
  VaultPrivateLink: {
    privateDnsZoneName: 'privatelink.vaultcore.azure.net',
    linkServiceGroupIds: ['keyVault'],
  },
  SqlPrivateLink: {
    privateDnsZoneName: 'privatelink.database.windows.net',
    linkServiceGroupIds: ['sqlServer'],
  },
  SignalRPrivateLink: {
    privateDnsZoneName: 'privatelink.service.signalr.net',
    linkServiceGroupIds: ['signalr'],
  },
  ServiceBusPrivateLink: {
    privateDnsZoneName: 'privatelink.servicebus.windows.net',
    linkServiceGroupIds: ['namespace'],
  },
  RedisCachePrivateLink: {
    privateDnsZoneName: 'privatelink.redis.cache.windows.net',
    linkServiceGroupIds: ['redisCache'],
  },
  PostgreSqlPrivateLink: {
    privateDnsZoneName: 'PostgreSql.database.azure.com',
    linkServiceGroupIds: ['PostgreSql'],
  },
  MySqlPrivateLink: {
    privateDnsZoneName: 'mysql.database.azure.com',
    linkServiceGroupIds: ['mysql'],
  },
  AppConfigPrivateLink: {
    privateDnsZoneName: 'privatelink.azconfig.io',
    linkServiceGroupIds: ['configurationStores'],
  },
  ApimPrivateLink: {
    privateDnsZoneName: 'privatelink.azure-api.net',
    linkServiceGroupIds: ['Gateway'],
  },
  AcrPrivateLink: {
    privateDnsZoneName: 'privatelink.azurecr.io',
    linkServiceGroupIds: ['azurecr'],
  },
};

type PrivateLinkFunc = (props: ResourceLinkType) => void;

export default ((): Record<keyof typeof linkConfig, PrivateLinkFunc> => {
  const rs: Record<string, PrivateLinkFunc> = {};

  Object.keys(linkConfig).forEach((key) => {
    const config = (linkConfig as any)[key];
    rs[key] = (props: ResourceLinkType) =>
      create({
        ...props,
        ...config,
      });
  });

  return rs;
})();
