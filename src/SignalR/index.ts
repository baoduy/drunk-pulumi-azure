import * as native from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import { getPrivateEndpointName, getSignalRName } from '../Common';
import {
  BasicResourceArgs,
  KeyVaultInfo,
  PrivateLinkPropsType,
} from '../types';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { addCustomSecret } from '../KeyVault/CustomHelper';

interface ResourceSkuArgs {
  capacity?: 1 | 2 | 5 | 10 | 20 | 50 | 100;
  name: 'Standard_S1' | 'Free_F1';
  tier?: 'Standard' | 'Free';
}

interface Props extends BasicResourceArgs {
  vaultInfo?: KeyVaultInfo;
  allowedOrigins?: pulumi.Input<pulumi.Input<string>[]>;
  privateLink?: PrivateLinkPropsType;
  kind?: native.signalrservice.ServiceKind;
  sku?: pulumi.Input<ResourceSkuArgs>;
}

export default ({
  name,
  group,
  vaultInfo,
  privateLink,
  kind = native.signalrservice.ServiceKind.SignalR,
  sku = {
    name: 'Standard_S1',
    tier: native.signalrservice.SignalRSkuTier.Standard,
    capacity: 1,
  },
  allowedOrigins,
}: Props) => {
  name = getSignalRName(name);

  const signalR = new native.signalrservice.SignalR(name, {
    resourceName: name,
    ...group,
    kind,

    cors: { allowedOrigins },
    features: [
      { flag: 'ServiceMode', value: 'Default' },
      //{ flag: 'EnableConnectivityLogs', value: 'Default' },
    ],
    networkACLs: privateLink
      ? {
          defaultAction: native.signalrservice.ACLAction.Allow,
          publicNetwork: {
            allow: [native.signalrservice.SignalRRequestType.ClientConnection],
            deny: [
              native.signalrservice.SignalRRequestType.ServerConnection,
              native.signalrservice.SignalRRequestType.RESTAPI,
            ],
          },
          privateEndpoints: [
            {
              name: getPrivateEndpointName(name),
              allow: [
                native.signalrservice.SignalRRequestType.ClientConnection,
                native.signalrservice.SignalRRequestType.ServerConnection,
                native.signalrservice.SignalRRequestType.RESTAPI,
              ],
            },
          ],
        }
      : {
          defaultAction: native.signalrservice.ACLAction.Allow,
          publicNetwork: {
            allow: [
              native.signalrservice.SignalRRequestType.ClientConnection,
              native.signalrservice.SignalRRequestType.ServerConnection,
              native.signalrservice.SignalRRequestType.RESTAPI,
            ],
          },
        },
    sku,
  });

  if (privateLink) {
    //The Private Zone will create in Dev and reuse for sandbox and prd.
    PrivateEndpoint({
      ...privateLink,
      resourceInfo: { name, group, id: signalR.id },
      privateDnsZoneName: 'privatelink.service.signalr.net',
      linkServiceGroupIds: privateLink.type ? [privateLink.type] : ['signalr'],
    });
  }

  if (vaultInfo) {
    signalR.hostName.apply(async (h) => {
      if (!h) return;

      const keys = await native.signalrservice.listSignalRKeys({
        resourceName: name,
        resourceGroupName: group.resourceGroupName,
      });

      addCustomSecret({
        name: `${name}-host`,
        value: h,
        vaultInfo,
        contentType: 'SignalR',
      });

      addCustomSecret({
        name: `${name}-primaryKey`,
        value: keys.primaryKey || '',
        vaultInfo,
        contentType: 'SignalR',
      });

      addCustomSecret({
        name: `${name}-primaryConnection`,
        value: keys.primaryConnectionString || '',
        vaultInfo,
        contentType: 'SignalR',
      });

      addCustomSecret({
        name: `${name}-secondaryKey`,
        value: keys.secondaryKey || '',
        vaultInfo,
        contentType: 'SignalR',
      });

      addCustomSecret({
        name: `${name}-secondaryConnection`,
        value: keys.secondaryConnectionString || '',
        vaultInfo,
        contentType: 'SignalR',
      });
    });
  }

  return signalR;
};
