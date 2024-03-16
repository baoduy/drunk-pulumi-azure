import * as AppConfiguration from '@pulumi/azure-native/appconfiguration';
import { defaultTags } from '../Common/AzureEnv';
import { getAppConfigName, getPrivateEndpointName } from '../Common/Naming';
import { KeyVaultInfo, PrivateLinkProps, ResourceGroupInfo } from '../types';
import { AppConfigDisableAccessKeysResource } from '../CustomProviders/AppConfigDisableAccessKeys';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { addCustomSecret } from '../KeyVault/CustomHelper';

interface Props {
  name: string;
  group: ResourceGroupInfo;
  disabledAccessKeys?: boolean;
  //enablePublicAccess?: boolean;
  privateLink?: PrivateLinkProps;
  vaultInfo?: KeyVaultInfo;
}

export default ({
  group,
  name,
  vaultInfo,
  disabledAccessKeys,
  //enablePublicAccess,
  privateLink,
}: Props) => {
  name = getAppConfigName(name);
  const readPrimaryConnectionStringKey = `${name}-read-primary-connection-string`;
  const readSecondaryConnectionStringKey = `${name}-read-secondary-connection-string`;

  //Default is enable public access however will be not if private link is enabled.
  // if (!enablePublicAccess && !privateLink) {
  //   enablePublicAccess = true;
  // }

  const appConfig = new AppConfiguration.ConfigurationStore(name, {
    configStoreName: name,
    ...group,
    identity: { type: 'SystemAssigned' },
    //This only able to disable when private link created.
    // publicNetworkAccess: enablePublicAccess
    //   ? AppConfiguration.PublicNetworkAccess.Enabled
    //   : AppConfiguration.PublicNetworkAccess.Disabled,
    sku: { name: 'Standard' },
    tags: defaultTags,
  });

  //Access Keys
  if (disabledAccessKeys) {
    new AppConfigDisableAccessKeysResource(
      name,
      { configStoreName: name, ...group },
      { dependsOn: appConfig }
    );
  } else if (vaultInfo) {
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
              name: key.name.includes('Primary')
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
      privateDnsZoneName: 'privatelink.azconfig.io',
      linkServiceGroupIds: ['appConfig'],
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
