import * as ss from '@pulumi/azure-native/signalrservice';
import * as pulumi from '@pulumi/pulumi';
import { naming, isPrd } from '../Common';
import {
  BasicResourceWithVaultArgs,
  PrivateLinkPropsType,
  ResourceInfoWithInstance,
} from '../types';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { addCustomSecrets } from '../KeyVault/CustomHelper';

interface ResourceSkuArgs {
  capacity?: 1 | 2 | 5 | 10 | 20 | 50 | 100;
  name: 'Standard_S1' | 'Free_F1';
  tier?: 'Standard' | 'Free';
}

interface Props extends BasicResourceWithVaultArgs {
  allowedOrigins?: pulumi.Input<pulumi.Input<string>[]>;
  privateLink?: PrivateLinkPropsType;
  kind?: ss.ServiceKind | string;
  sku?: pulumi.Input<ResourceSkuArgs>;
}

/**
 * There is no encryption available for SignalR yet
 * */
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
  name = naming.getSignalRName(name);

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
              name: naming.getPrivateEndpointName(name),
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
      addCustomSecrets({
        vaultInfo,
        contentType: 'SignalR',
        dependsOn: signalR,
        items: [
          { name: `${name}-host`, value: h },
          //{ name: `${name}-primaryKey`, value: keys.primaryKey! },
          {
            name: `${name}-primaryConnection`,
            value: keys.primaryConnectionString!,
          },
          //{ name: `${name}-secondaryKey`, value: keys.secondaryKey! },
          {
            name: `${name}-secondaryConnection`,
            value: keys.secondaryConnectionString!,
          },
        ],
      });
    });
  }

  return { name, group, id: signalR.id, instance: signalR };
};
