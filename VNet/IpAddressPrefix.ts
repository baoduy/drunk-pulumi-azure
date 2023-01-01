import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';

import { RangeOf } from '../Common/Helpers';
import { getIpAddressPrefixName } from '../Common/Naming';
import Locker from '../Core/Locker';
import { Dictionary } from '../Tools/Dictionary';
import { BasicResourceArgs } from '../types';
import IpAddress from './IpAddress';

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

  const ipAddresses = new Dictionary<network.PublicIPAddress>();

  if (ipAddressConfig) {
    RangeOf(ipAddressConfig.numberOfIps).forEach((i) => {
      const n = `${name}-${i}`;
      const ip = IpAddress({
        ...ipAddressConfig,
        name: n,
        group,
        publicIPPrefix: ipAddressPrefix,
        sku: { name: "Standard", tier: "Regional" },
        lock,
      });

      ipAddresses.add(n, ip);
    });
  }

  return { ipAddressPrefix, ipAddresses };
};
