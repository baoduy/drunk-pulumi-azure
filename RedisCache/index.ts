import * as native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

import { BasicResourceArgs, KeyVaultInfo } from "../types";

import { ToWords } from "to-words";
import { convertToIpRange } from "../VNet/Helper";
import { getRedisCacheName } from "../Common/Naming";
import { addLegacySecret } from "../KeyVault/LegacyHelper";

const toWord = new ToWords();

interface Props extends BasicResourceArgs {
  vaultInfo?: KeyVaultInfo;
  allowsIpAddresses?: string[];
  sku?: native.types.input.cache.SkuArgs;
}

export default ({
  name,
  group,
  allowsIpAddresses,
  vaultInfo,
  sku = { name: "Basic", family: "C", capacity: 0 },
}: Props) => {
  name = getRedisCacheName(name);
  const redis = new native.cache.Redis(name, {
    name,
    ...group,
    minimumTlsVersion: "1.2",
    sku,
  });

  // new native.cache.PatchSchedule(
  //   name,
  //   {
  //     name: 'default',
  //     ...group,
  //     scheduleEntries: [
  //       { dayOfWeek: 'Everyday', startHourUtc: 0, maintenanceWindow: 'PT5H' },
  //     ],
  //   },
  //   { dependsOn: redis }
  // );

  if (allowsIpAddresses) {
    convertToIpRange(allowsIpAddresses).map((range, i) => {
      const n = `allow_Ip_${toWord.convert(i)}`.toLowerCase();
      return new native.cache.FirewallRule(n, {
        ruleName: n,
        cacheName: redis.name,
        ...group,
        startIP: range.start,
        endIP: range.end,
      });
    });
  }

  if (vaultInfo) {
    pulumi.all([redis.name, redis.hostName]).apply(async ([n, h]) => {
      if (!h) return;

      const keys = await native.cache.listRedisKeys({
        name: n,
        resourceGroupName: group.resourceGroupName,
      });

      await addLegacySecret({
        name: `${name}-primary-key`,
        value: keys.primaryKey,
        vaultInfo,
        contentType: "Redis Cache",
      });

      await addLegacySecret({
        name: `${name}-secondary-key`,
        value: keys.secondaryKey,
        vaultInfo,
        contentType: "Redis Cache",
      });

      await addLegacySecret({
        name: `${name}-primary-connection`,
        value: `${name}.redis.cache.windows.net:6380,password=${keys.primaryKey},ssl=True,abortConnect=False`,
        vaultInfo,
        contentType: "Redis Cache",
      });

      await addLegacySecret({
        name: `${name}-secondary-connection`,
        value: `${name}.redis.cache.windows.net:6380,password=${keys.secondaryKey},ssl=True,abortConnect=False`,
        vaultInfo,
        contentType: "Redis Cache",
      });
    });
  }

  return redis;
};
