import * as network from '@pulumi/azure-native/network';
import { PublicIPAddress } from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';
import { naming } from '../Common';
import { Locker } from '../Core/Locker';
import { BasicResourceArgs, WithNamedType } from '../types';
import * as IpAddress from './IpAddress';

type AddressNameType = Array<WithNamedType>;

export interface PublicIpAddressPrefixProps extends BasicResourceArgs {
  prefixLength?: 28 | 29 | 30 | 31;
  createPrefix?: boolean;
  config?: {
    version?: network.IPVersion;
    enableDdos?: boolean;
    ddosCustomPolicyId?: Input<string>;
    allocationMethod?: network.IPAllocationMethod;
  };
  ipAddresses?: AddressNameType;
  //This need a lock
  lock?: boolean;
  retainOnDelete?: boolean;
}

export type PublicIpAddressPrefixResult = {
  addresses: Record<string, PublicIPAddress>;
  addressPrefix?: network.PublicIPPrefix;
};

export default ({
  name,
  group,
  prefixLength = 30,
  createPrefix = true,
  ipAddresses,
  config = {
    version: network.IPVersion.IPv4,
    allocationMethod: network.IPAllocationMethod.Static,
  },
  dependsOn,
  lock = true,
  retainOnDelete,
}: PublicIpAddressPrefixProps): PublicIpAddressPrefixResult => {
  const n = naming.getIpAddressPrefixName(name);
  const sku = { name: 'Standard', tier: 'Regional' };

  const addressPrefix = createPrefix
    ? new network.PublicIPPrefix(
        n,
        {
          publicIpPrefixName: n,
          ...group,
          prefixLength,
          sku,
        },
        { dependsOn, ignoreChanges: ['prefixLength'], retainOnDelete },
      )
    : undefined;

  if (lock && addressPrefix) {
    Locker({
      name,
      resource: addressPrefix,
    });
  }

  const addresses: Record<string, PublicIPAddress> = {};

  if (ipAddresses) {
    ipAddresses.forEach((ip, i) => {
      const n = ip.name ?? `${name}-${i}`;
      addresses[n] = IpAddress.create({
        ...config,
        name: n,
        group,
        publicIPPrefix: addressPrefix,
        lock,
        dependsOn,
      });
    });
  }

  return { addressPrefix, addresses };
};
