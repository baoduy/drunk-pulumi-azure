import * as network from "@pulumi/azure-native/network";
import { Input } from "@pulumi/pulumi";
import { BasicResourceArgs } from "../types";
import { isPrd } from "../Common/AzureEnv";
import { getIpAddressName } from "../Common/Naming";
import {Locker} from "../Core/Locker";
import { organization } from "../Common/StackEnv";

interface Props extends BasicResourceArgs {
  version?: network.IPVersion;
  publicIPPrefix?: network.PublicIPPrefix;
  enableDdos?: boolean;
  ddosCustomPolicyId?: Input<string>;
  allocationMethod?: network.IPAllocationMethod;
  tier?: network.PublicIPAddressSkuTier | string;
  enableZone?: boolean;
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
  enableZone = isPrd,
  allocationMethod = network.IPAllocationMethod.Static,
  tier = network.PublicIPAddressSkuTier.Regional,
  lock = isPrd,
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
        enableDdos && ddosCustomPolicyId
          ? {
              protectionMode: enableDdos ? "Enabled" : "Disabled",
              ddosProtectionPlan: { id: ddosCustomPolicyId },
            }
          : undefined,
      sku: { name: "Standard", tier },
      zones: enableZone ? ["1", "2", "3"] : undefined,
    },
    { dependsOn: publicIPPrefix },
  );

  if (lock) {
    Locker({ name, resource: ipAddress });
  }

  return ipAddress;
};
