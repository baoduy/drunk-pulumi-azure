import * as ss from '@pulumi/azure-native/signalrservice';
import * as pulumi from '@pulumi/pulumi';
import { getPrivateEndpointName, getSignalRName, isPrd } from '../Common';
import {
  BasicResourceArgs,
  KeyVaultInfo,
  PrivateLinkPropsType,
  ResourceInfoWithInstance,
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
  kind?: ss.ServiceKind | string;
  sku?: pulumi.Input<ResourceSkuArgs>;
}

export default ({
  name,
  group,
  vaultInfo,
  privateLink,
  kind = ss.ServiceKind.SignalR,
  sku = isPrd
    ? {
        name: 'Standard_S1',
        tier: ss.SignalRSkuTier.Standard,
        capacity: 1,
      }
    : {
        name: 'Free_F1',
        tier: 'Free',
      },
  allowedOrigins,
}: Props): ResourceInfoWithInstance<ss.SignalR> => {
  name = getSignalRName(name);

  const signalR = new ss.SignalR(name, {
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
          defaultAction: ss.ACLAction.Allow,
          publicNetwork: {
            allow: [ss.SignalRRequestType.ClientConnection],
            deny: [
              ss.SignalRRequestType.ServerConnection,
              ss.SignalRRequestType.RESTAPI,
            ],
          },
          privateEndpoints: [
            {
              name: getPrivateEndpointName(name),
              allow: [
                ss.SignalRRequestType.ClientConnection,
                ss.SignalRRequestType.ServerConnection,
              ],
              deny: [ss.SignalRRequestType.RESTAPI],
            },
          ],
        }
      : {
          defaultAction: ss.ACLAction.Allow,
          publicNetwork: {
            allow: [
              ss.SignalRRequestType.ClientConnection,
              ss.SignalRRequestType.ServerConnection,
            ],
            deny: [ss.SignalRRequestType.RESTAPI],
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

      const keys = await ss.listSignalRKeys({
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

  return { name, group, id: signalR.id, instance: signalR };
};
