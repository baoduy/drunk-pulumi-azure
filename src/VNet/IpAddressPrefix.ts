import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';
import { getIpAddressPrefixName } from '../Common/Naming';
import Locker from '../Core/Locker';
import { BasicResourceArgs } from '../types';
import IpAddress from './IpAddress';
import { PublicIPAddress } from '@pulumi/azure-native/network';

type AddressNameType = Array<{
  name: string;
}>;

interface Props extends BasicResourceArgs {
  prefixLength: number;
  config?: {
    version?: network.IPVersion;
    enableDdos?: boolean;
    ddosCustomPolicyId?: Input<string>;
    allocationMethod?: network.IPAllocationMethod;
  };
  ipAddresses: AddressNameType;
  lock?: boolean;
}
export default ({
  name,
  group,
  prefixLength,
  ipAddresses,
  config = {
    version: network.IPVersion.IPv4,
    allocationMethod: network.IPAllocationMethod.Static,
  },
  lock,
}: Props) => {
  const n = getIpAddressPrefixName(name);

  const addressPrefix = new network.PublicIPPrefix(n, {
    publicIpPrefixName: n,
    ...group,
    prefixLength: prefixLength,
    sku: { name: 'Standard', tier: 'Regional' },
  });

  if (lock) {
    Locker({
      name,
      resource: addressPrefix,
    });
  }

  const addresses: Record<string, PublicIPAddress> = {};

  if (ipAddresses) {
    ipAddresses.forEach((ip, i) => {
      const n = ip.name ?? `${name}-${i}`;

      const item = IpAddress({
        ...config,
        name: n,
        group,
        publicIPPrefix: addressPrefix,
        sku: { name: 'Standard', tier: 'Regional' },
        lock,
      });

      addresses[n] = item;
    });
  }

  return { addressPrefix, addresses };
};
