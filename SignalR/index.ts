import * as native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

import { BasicResourceArgs, KeyVaultInfo, PrivateLinkProps } from "../types";
import { defaultTags, isDev } from "../Common/AzureEnv";
import PrivateEndpoint from "../VNet/PrivateEndpoint";
import { getPrivateEndpointName, getSignalRName } from "../Common/Naming";
import { addLegacySecret } from "../KeyVault/LegacyHelper";

interface Props extends BasicResourceArgs {
  vaultInfo?: KeyVaultInfo;
  allowedOrigins?: pulumi.Input<pulumi.Input<string>[]>;
  privateLink?: PrivateLinkProps;
  kind?: native.signalrservice.ServiceKind;
  sku?: Promise<native.signalrservice.ResourceSkuArgs>;
}

export default ({
  name,
  group,
  vaultInfo,
  privateLink,
  kind = native.signalrservice.ServiceKind.SignalR,
  sku = {
    name: "Standard_S1",
    tier: native.signalrservice.SignalRSkuTier.Standard,
    capacity: 1,
  },
  allowedOrigins,
}: Props) => {
  const privateEndpointName = getPrivateEndpointName(name);
  name = getSignalRName(name);

  const signalR = new native.signalrservice.SignalR(name, {
    resourceName: name,
    ...group,
    kind,

    cors: { allowedOrigins },
    features: [
      { flag: "ServiceMode", value: "Default" },
      //{ flag: 'EnableConnectivityLogs', value: 'Default' },
    ],
    networkACLs: privateLink
      ? {
          defaultAction: native.signalrservice.ACLAction.Allow,
          publicNetwork: isDev
            ? {
                allow: [
                  native.signalrservice.SignalRRequestType.ClientConnection,
                  native.signalrservice.SignalRRequestType.ServerConnection,
                  native.signalrservice.SignalRRequestType.RESTAPI,
                ],
                //deny: [native.signalrservice.SignalRRequestType.RESTAPI],
              }
            : {
                allow: [
                  native.signalrservice.SignalRRequestType.ClientConnection,
                ],
                deny: [
                  native.signalrservice.SignalRRequestType.ServerConnection,
                  native.signalrservice.SignalRRequestType.RESTAPI,
                ],
              },
          privateEndpoints: [
            {
              name: privateEndpointName,
              allow: [
                native.signalrservice.SignalRRequestType.ClientConnection,
                native.signalrservice.SignalRRequestType.ServerConnection,
                native.signalrservice.SignalRRequestType.RESTAPI,
              ],
            },
          ],
        }
      : undefined,
    sku,
    tags: defaultTags,
  });

  let privateEndpoint: native.network.PrivateEndpoint | undefined = undefined;

  if (privateLink) {
    //The Private Zone will create in Dev and reuse for sandbox and prd.
    privateEndpoint = PrivateEndpoint({
      name: privateEndpointName,
      group,
      privateDnsZoneName: "privatelink.service.signalr.net",
      ...privateLink,
      linkServiceGroupIds: ["signalr"],
      resourceId: signalR.id,
    });
  }

  if (vaultInfo) {
    signalR.hostName.apply(async (h) => {
      if (!h) return;

      const keys = await native.signalrservice.listSignalRKeys({
        resourceName: name,
        resourceGroupName: group.resourceGroupName,
      });

      await addLegacySecret({
        name: `${name}-host`,
        value: h,
        vaultInfo,
        contentType: "SignalR",
      });

      await addLegacySecret({
        name: `${name}-primaryKey`,
        value: keys.primaryKey || "",
        vaultInfo,
        contentType: "SignalR",
      });

      await addLegacySecret({
        name: `${name}-primaryConnection`,
        value: keys.primaryConnectionString || "",
        vaultInfo,
        contentType: "SignalR",
      });

      await addLegacySecret({
        name: `${name}-secondaryKey`,
        value: keys.secondaryKey || "",
        vaultInfo,
        contentType: "SignalR",
      });

      await addLegacySecret({
        name: `${name}-secondaryConnection`,
        value: keys.secondaryConnectionString || "",
        vaultInfo,
        contentType: "SignalR",
      });
    });
  }

  return { signalR, privateEndpoint };
};
