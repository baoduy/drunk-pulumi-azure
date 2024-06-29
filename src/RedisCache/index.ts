import * as cache from "@pulumi/azure-native/cache";
import * as pulumi from "@pulumi/pulumi";

import { BasicResourceArgs, KeyVaultInfo, NetworkType } from "../types";

import { ToWords } from "to-words";
import { convertToIpRange } from "../VNet/Helper";
import { getRedisCacheName } from "../Common/Naming";
import { isPrd } from "../Common/AzureEnv";
import { addCustomSecret } from "../KeyVault/CustomHelper";
import privateEndpointCreator from "../VNet/PrivateEndpoint";

const toWord = new ToWords();

interface Props extends BasicResourceArgs {
  vaultInfo?: KeyVaultInfo;
  network?: NetworkType;
  sku?: {
    name: cache.SkuName | string;
    family: cache.SkuFamily | string;
    capacity: number;
  };
}

export default ({
  name,
  group,
  network,
  vaultInfo,
  sku = { name: "Basic", family: "C", capacity: 0 },
}: Props) => {
  name = getRedisCacheName(name);
  const redis = new cache.Redis(name, {
    name,
    ...group,
    minimumTlsVersion: "1.2",
    enableNonSslPort: false,
    identity: { type: cache.ManagedServiceIdentityType.SystemAssigned },
    sku,
    zones: isPrd && sku.name === "Premium" ? ["1", "2", "3"] : undefined,
    subnetId: network?.subnetId,
    publicNetworkAccess: network?.privateLink ? "Disabled" : "Enabled",
  });

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
      group,
      name,
      resourceId: redis.id,
      privateDnsZoneName: "privatelink.redis.cache.windows.net",
      subnetIds: network.privateLink.subnetIds,
      linkServiceGroupIds: network.privateLink.type
        ? [network.privateLink.type]
        : ["redisCache"],
    });
  }

  if (vaultInfo) {
    pulumi.all([redis.name, redis.hostName]).apply(async ([n, h]) => {
      if (!h) return;

      const keys = await cache.listRedisKeys({
        name: n,
        resourceGroupName: group.resourceGroupName,
      });

      addCustomSecret({
        name: `${name}-primary-key`,
        value: keys.primaryKey,
        vaultInfo,
        contentType: "Redis Cache",
      });

      addCustomSecret({
        name: `${name}-secondary-key`,
        value: keys.secondaryKey,
        vaultInfo,
        contentType: "Redis Cache",
      });

      addCustomSecret({
        name: `${name}-primary-connection`,
        value: `${name}.redis.cache.windows.net:6380,password=${keys.primaryKey},ssl=True,abortConnect=False`,
        vaultInfo,
        contentType: "Redis Cache",
      });

      addCustomSecret({
        name: `${name}-secondary-connection`,
        value: `${name}.redis.cache.windows.net:6380,password=${keys.secondaryKey},ssl=True,abortConnect=False`,
        vaultInfo,
        contentType: "Redis Cache",
      });
    });
  }

  return redis;
};
