import * as cache from '@pulumi/azure-native/cache';
import * as pulumi from '@pulumi/pulumi';

import {
  BasicResourceWithVaultArgs,
  NetworkPropsType,
  ResourceInfoWithInstance,
} from '../types';
import { ToWords } from 'to-words';
import { convertToIpRange } from '../VNet/Helper';
import { isPrd, naming } from '../Common';
import { addCustomSecrets } from '../KeyVault/CustomHelper';
import privateEndpointCreator from '../VNet/PrivateEndpoint';

const toWord = new ToWords();

interface Props extends BasicResourceWithVaultArgs {
  network?: NetworkPropsType;
  sku?: {
    name: cache.SkuName | string;
    family: cache.SkuFamily | string;
    capacity: number;
  };
}
/**
 * There is no encryption available for Redis yet
 * */
export default ({
  name,
  group,
  network,
  vaultInfo,
  sku = { name: 'Basic', family: 'C', capacity: 0 },
  dependsOn,
  ignoreChanges,
  importUri,
}: Props): ResourceInfoWithInstance<cache.Redis> => {
  name = naming.getRedisCacheName(name);
  const redis = new cache.Redis(
    name,
    {
      name,
      ...group,
      minimumTlsVersion: '1.2',
      enableNonSslPort: false,
      identity: { type: cache.ManagedServiceIdentityType.SystemAssigned },
      sku,
      zones: isPrd && sku.name === 'Premium' ? ['1', '2', '3'] : undefined,
      subnetId: network?.subnetId,
      publicNetworkAccess: network?.privateLink ? 'Disabled' : 'Enabled',
    },
    { dependsOn, import: importUri, ignoreChanges },
  );

  //Whitelist IpAddress
  if (network?.ipAddresses) {
    pulumi.output(network.ipAddresses).apply((ips) => {
      convertToIpRange(ips).map((range, i) => {
        const n = `allow_Ip_${toWord.convert(i)}`.toLowerCase();
        return new cache.FirewallRule(n, {
          ruleName: n,
          cacheName: redis.name,
          ...group,
          startIP: range.start,
          endIP: range.end,
        });
      });
    });
  }

  //Private Link
  if (network?.privateLink) {
    privateEndpointCreator({
      ...network.privateLink,
      resourceInfo: { name, group, id: redis.id },
      privateDnsZoneName: 'privatelink.redis.cache.windows.net',
      linkServiceGroupIds: network.privateLink.type
        ? [network.privateLink.type]
        : ['redisCache'],
    });
  }

  if (vaultInfo) {
    pulumi.all([redis.name, redis.hostName]).apply(async ([n, h]) => {
      if (!h) return;

      const keys = await cache.listRedisKeys({
        name: n,
        resourceGroupName: group.resourceGroupName,
      });
      addCustomSecrets({
        vaultInfo,
        contentType: 'Redis Cache',
        dependsOn: redis,
        items: [
          {
            name: `${name}-primary-connection`,
            value: `${name}.redis.cache.windows.net:6380,password=${keys.primaryKey},ssl=True,abortConnect=False`,
          },
          {
            name: `${name}-secondary-connection`,
            value: `${name}.redis.cache.windows.net:6380,password=${keys.secondaryKey},ssl=True,abortConnect=False`,
          },
        ],
      });
    });
  }

  return {
    name,
    group,
    id: redis.id,
    instance: redis,
  };
};
