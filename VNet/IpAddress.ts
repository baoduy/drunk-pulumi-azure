import * as network from "@pulumi/azure-native/network";

import { Input } from "@pulumi/pulumi";

import { BasicResourceArgs } from "../types";
import { defaultTags, isPrd } from "../Common/AzureEnv";
import { getIpAddressName } from "../Common/Naming";
import Locker from "../Core/Locker";
import { organization } from "../Common/StackEnv";

interface Props extends BasicResourceArgs {
  version?: network.IPVersion;
  publicIPPrefix?: network.PublicIPPrefix;
  enableDdos?: boolean;
  ddosCustomPolicyId?: Input<string>;
  allocationMethod?: network.IPAllocationMethod;
  sku?: {
    name?: network.PublicIPAddressSkuName;
    tier?: network.PublicIPAddressSkuTier;
  };
  lock?: boolean;
}

const getIpName = (name: string) => getIpAddressName(name);

export default ({
  name,
  group,
  version = network.IPVersion.IPv4,
  publicIPPrefix,
  enableDdos,
  ddosCustomPolicyId,
  allocationMethod = network.IPAllocationMethod.Static,
  sku = {
    name: network.PublicIPAddressSkuName.Basic,
    tier: network.PublicIPAddressSkuTier.Regional,
  },
  lock = true,
}: Props) => {
  name = getIpName(name);

  const ipAddress = new network.PublicIPAddress(
    name,
    {
      publicIpAddressName: name,
      ...group,
      dnsSettings: { domainNameLabel: `${name}-${organization}` },
      publicIPAddressVersion: version,
      publicIPAllocationMethod: allocationMethod,
      publicIPPrefix: publicIPPrefix ? { id: publicIPPrefix.id } : undefined,
      ddosSettings:
        enableDdos && sku.name === network.PublicIPAddressSkuName.Standard
          ? {
              protectedIP: true,
              protectionCoverage:
                network.DdosSettingsProtectionCoverage.Standard,
              ddosCustomPolicy: ddosCustomPolicyId
                ? { id: ddosCustomPolicyId }
                : undefined,
            }
          : undefined,
      sku,
      zones: isPrd ? ["1", "2", "3"] : undefined,
      tags: defaultTags,
    },
    { dependsOn: publicIPPrefix }
  );

  if (lock) {
    Locker({ name, resourceId: ipAddress.id, dependsOn: ipAddress });
  }

  return ipAddress;
};
