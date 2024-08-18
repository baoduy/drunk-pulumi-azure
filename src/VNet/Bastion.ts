import { BasicResourceArgs } from '../types';
import * as IpAddress from './IpAddress';
import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';
import { naming } from '../Common';

export interface BastionProps extends BasicResourceArgs {
  subnetId: Input<string>;
  sku?: 'Basic' | 'Standard' | 'Developer' | string;
}

export default ({
  name,
  group,
  subnetId,
  dependsOn,
  importUri,
  ignoreChanges,
  sku = 'Basic',
}: BastionProps) => {
  name = naming.getBastionName(name);

  const ipAddressId = IpAddress.create({
    name,
    group,
  }).id;

  return new network.BastionHost(
    name,
    {
      bastionHostName: name,
      ...group,
      sku: { name: sku },
      ipConfigurations: [
        {
          name: 'IpConfig',
          publicIPAddress: { id: ipAddressId },
          subnet: { id: subnetId },
          privateIPAllocationMethod: network.IPAllocationMethod.Dynamic,
        },
      ],
    },
    {
      dependsOn: dependsOn,
      deleteBeforeReplace: true,
      import: importUri,
      ignoreChanges,
    },
  );
};
