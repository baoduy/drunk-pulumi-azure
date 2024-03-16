import * as network from '@pulumi/azure-native/network';
import { DefaultResourceArgs, BasicResourceArgs } from '../types';
import creator from '../Core/ResourceCreator';
import { Input } from '@pulumi/pulumi';
import { getAppGatewayName } from '../Common/Naming';

interface Props extends DefaultResourceArgs, BasicResourceArgs {
  publicIpAddressId: Input<string>;
  subnetId: Input<string>;
}

export default ({ name, group, subnetId, publicIpAddressId }: Props) => {
  name = getAppGatewayName(name);

  const rs = creator(network.ApplicationGateway, {
    applicationGatewayName: name,
    ...group,
    enableHttp2: true,
    //identity: { type: 'SystemAssigned' },

    frontendPorts: [{ port: 80 }, { port: 443 }],
    frontendIPConfigurations: [
      {
        publicIPAddress: { id: publicIpAddressId },
      },
    ],

    gatewayIPConfigurations: [
      {
        subnet: { id: subnetId },
      },
    ],

    sku: {
      capacity: 1,
      name: network.ApplicationGatewaySkuName.Standard_Small,
      tier: network.ApplicationGatewayTier.Standard,
    },
  } as network.ApplicationGatewayArgs & DefaultResourceArgs);

  return rs;
};
