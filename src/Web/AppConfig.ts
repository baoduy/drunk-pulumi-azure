import * as AppConfiguration from "@pulumi/azure-native/appconfiguration";
import { getAppConfigName, getPrivateEndpointName } from "../Common/Naming";
import { KeyVaultInfo, PrivateLinkProps, ResourceGroupInfo } from "../types";
import { AppConfigDisableAccessKeysResource } from "@drunk-pulumi/azure-providers/AppConfigDisableAccessKeys";
import PrivateEndpoint from "../VNet/PrivateEndpoint";
import { addCustomSecret } from "../KeyVault/CustomHelper";

export type AppConfigProps = {
  name: string;
  group: ResourceGroupInfo;
  privateLink?: PrivateLinkProps;
  disableLocalAuth?: boolean;
  vaultInfo: KeyVaultInfo;
};

export default ({
  group,
  name,
  vaultInfo,
  disableLocalAuth,
  privateLink,
}: AppConfigProps) => {
  name = getAppConfigName(name);
  const readPrimaryConnectionStringKey = `${name}-read-primary-connection-string`;
  const readSecondaryConnectionStringKey = `${name}-read-secondary-connection-string`;

  const appConfig = new AppConfiguration.ConfigurationStore(name, {
    configStoreName: name,
    ...group,
    identity: { type: "SystemAssigned" },

    disableLocalAuth,
    publicNetworkAccess: privateLink
      ? AppConfiguration.PublicNetworkAccess.Disabled
      : AppConfiguration.PublicNetworkAccess.Enabled,

    sku: { name: "Standard" },
  });

  //Access Keys
  if (vaultInfo && !disableLocalAuth) {
    appConfig.id.apply(async (id) => {
      if (!id) return;
      //Load the  keys from Azure
      const keys = await AppConfiguration.listConfigurationStoreKeys({
        configStoreName: name,
        ...group,
      });

      if (keys.value) {
        keys.value.map((key) => {
          //Only Read Connection String here
          if (key.readOnly) {
            addCustomSecret({
              name: key.name.includes("Primary")
                ? readPrimaryConnectionStringKey
                : readSecondaryConnectionStringKey,
              value: key.connectionString,
              contentType: `AppConfig ${name} ${key.name}`,
              vaultInfo,
            });
          }
        });
      }
    });
  }

  //Private Link
  if (privateLink) {
    PrivateEndpoint({
      name: getPrivateEndpointName(name),
      group,
      privateDnsZoneName: `${name}.privatelink.azconfig.io`,
      linkServiceGroupIds: ["appConfig"],
      resourceId: appConfig.id,
      ...privateLink,
    });
  }

  return {
    appConfig,
    vaultNames: {
      readPrimaryConnectionStringKey,
      readSecondaryConnectionStringKey,
    },
  };
};
