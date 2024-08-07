import * as appConfig from '@pulumi/azure-native/appconfiguration';
import { getAppConfigName, isPrd } from '../Common';
import {
  PrivateLinkPropsType,
  ResourceInfo,
  ResourceWithVaultArgs,
} from '../types';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { addCustomSecret } from '../KeyVault/CustomHelper';

export type AppConfigProps = ResourceWithVaultArgs & {
  privateLink?: PrivateLinkPropsType;
  disableLocalAuth?: boolean;
};

export default ({
  group,
  name,
  vaultInfo,
  disableLocalAuth,
  privateLink,
}: AppConfigProps): ResourceInfo & {
  instance: appConfig.ConfigurationStore;
} => {
  name = getAppConfigName(name);
  const readPrimaryConnectionStringKey = `${name}-read-primary-connection-string`;
  const readSecondaryConnectionStringKey = `${name}-read-secondary-connection-string`;

  const app = new appConfig.ConfigurationStore(name, {
    configStoreName: name,
    ...group,
    identity: { type: 'SystemAssigned' },
    enablePurgeProtection: isPrd,
    softDeleteRetentionInDays: isPrd ? 7 : 1,
    disableLocalAuth,
    publicNetworkAccess: privateLink
      ? appConfig.PublicNetworkAccess.Disabled
      : appConfig.PublicNetworkAccess.Enabled,

    sku: { name: 'Standard' },
  });

  //Access Keys
  if (vaultInfo && !disableLocalAuth) {
    app.id.apply(async (id) => {
      if (!id) return;
      //Load the  keys from Azure
      const keys = await appConfig.listConfigurationStoreKeys({
        configStoreName: name,
        ...group,
      });

      if (keys.value) {
        keys.value.map((key) => {
          //Only Read Connection String here
          if (key.readOnly) {
            addCustomSecret({
              name: key.name.includes('Primary')
                ? readPrimaryConnectionStringKey
                : readSecondaryConnectionStringKey,
              value: key.connectionString,
              contentType: `AppConfig ${name} ${key.name}`,
              vaultInfo,
              dependsOn: app,
            });
          }
        });
      }
    });
  }

  //Private Link
  if (privateLink) {
    PrivateEndpoint({
      resourceInfo: { name, group, id: app.id },
      privateDnsZoneName: 'privatelink.azconfig.io',
      linkServiceGroupIds: ['appConfig'],
      ...privateLink,
    });
  }

  return {
    name,
    group,
    id: app.id,
    instance: app,
  };
};
