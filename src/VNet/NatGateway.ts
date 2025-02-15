import * as network from '@pulumi/azure-native/network';
import { BasicResourceArgs } from '../types';
import { Input } from '@pulumi/pulumi';
import { naming } from '../Common';

interface NatGatewayProps extends BasicResourceArgs {
  /** the list of public ip address IDs */
  publicIpAddresses?: Input<string>[];
  /** the list of public ip address prefix IDs */
  publicIpPrefixes?: Input<string>[];
}

export default ({
  name,
  group,
  publicIpPrefixes,
  publicIpAddresses,
  dependsOn,
}: NatGatewayProps) => {
  if (!publicIpAddresses && !publicIpPrefixes)
    throw new Error(
      "Either 'publicIpAddresses' or 'publicIpPrefixes' must be provided.",
    );

  name = naming.getNatGatewayName(name);
  return new network.NatGateway(
    name,
    {
      ...group,
      natGatewayName: name,
      publicIpAddresses: publicIpAddresses?.map((id) => ({ id })),
      publicIpPrefixes: publicIpPrefixes?.map((id) => ({ id })),
      //refer this https://learn.microsoft.com/en-us/azure/nat-gateway/nat-availability-zones
      //zones: isPrd ? ["1", "2", "3"] : undefined,
      sku: {
        name: network.NatGatewaySkuName.Standard,
      },
    },
    { dependsOn },
  );
};
