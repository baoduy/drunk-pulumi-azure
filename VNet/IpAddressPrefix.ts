import * as network from "@pulumi/azure-native/network";
import { Input } from "@pulumi/pulumi";
import { BasicResourceArgs } from "../types";
import { getIpAddressPrefixName } from "../Common/Naming";
import { RangeOf } from "../Common/Helpers";
import IpAddress from "./IpAddress";
import Locker from "../Core/Locker";
interface Props extends BasicResourceArgs {
  prefixLength: number;
  ipAddressConfig?: {
    /** How many Ip address would like to be created. This must be <= prefixLength */
    numberOfIps: number;
    version?: network.IPVersion;
    enableDdos?: boolean;
    ddosCustomPolicyId?: Input<string>;
    allocationMethod?: network.IPAllocationMethod;
  };
  lock?: boolean;
}
export default ({
  name,
  group,
  prefixLength,
  ipAddressConfig,
  lock,
}: Props) => {
  const n = getIpAddressPrefixName(name);

  const ipAddressPrefix = new network.PublicIPPrefix(n, {
    publicIpPrefixName: n,
    ...group,
    prefixLength: prefixLength,
    sku: { name: "Regional", tier: "Standard" },
  });

  if (lock) {
    Locker({
      name,
      resourceId: ipAddressPrefix.id,
      dependsOn: ipAddressPrefix,
    });
  }

  let ipAddresses: network.PublicIPAddress[] | undefined = undefined;
  if (ipAddressConfig) {
    ipAddresses = RangeOf(ipAddressConfig.numberOfIps).map((i) =>
      IpAddress({
        ...ipAddressConfig,
        name: `${name}-${i}`,
        group,
        publicIPPrefix: ipAddressPrefix,
        sku: { name: "Standard", tier: "Regional" },
        lock,
      })
    );
  }

  return { ipAddressPrefix, ipAddresses };
};
