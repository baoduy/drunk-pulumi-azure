import * as registry from '@pulumi/azure-native/containerregistry';
import {
  BasicArgs,
  KeyVaultInfo,
  NetworkPropsType,
  ResourceGroupInfo,
  ResourceInfoWithInstance,
} from '../types';
import * as global from '../Common/GlobalEnv';
import { getAcrName, getPasswordName } from '../Common';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { addCustomSecret } from '../KeyVault/CustomHelper';

interface Props extends BasicArgs {
  name: string;
  group?: ResourceGroupInfo;
  adminUserEnabled?: boolean;
  enableStorageAccount?: boolean;
  vaultInfo?: KeyVaultInfo;
  sku?: registry.SkuName | string;
  /**Only support Premium sku*/
  network?: Omit<NetworkPropsType, 'subnetId'>;
}

/** The Azure Container Registry will be created at the GLobal Group.
 * Follow ReadMe file to setup the cleaning tasks for this Registry
 */
export default ({
  name,
  group = global.groupInfo,
  sku = registry.SkuName.Basic,
  adminUserEnabled = true,
  vaultInfo,
  network,
  dependsOn,
  ignoreChanges,
}: Props): ResourceInfoWithInstance<registry.Registry> => {
  name = getAcrName(name);

  const urlKey = `${name}-url`;
  const userNameKey = `${name}-user-name`;
  const primaryPasswordKey = getPasswordName(name, 'primary');
  const secondaryPasswordKey = getPasswordName(name, 'secondary');

  const resource = new registry.Registry(
    name,
    {
      registryName: name,
      ...group,

      sku: { name: sku },
      adminUserEnabled,
      publicNetworkAccess: network?.privateLink ? 'Disabled' : 'Enabled',

      networkRuleSet:
        sku === 'Premium' && network
          ? {
              defaultAction: registry.DefaultAction.Allow,

              ipRules: network.ipAddresses
                ? network.ipAddresses.map((ip) => ({ iPAddressOrRange: ip }))
                : undefined,
            }
          : undefined,
    },
    { dependsOn, ignoreChanges },
  );

  if (sku === 'Premium' && network?.privateLink) {
    PrivateEndpoint({
      resourceInfo: { name, group, id: resource.id },
      privateDnsZoneName: 'privatelink.azurecr.io',
      subnetIds: network.privateLink.subnetIds,
      linkServiceGroupIds: network.privateLink.type
        ? [network.privateLink.type]
        : ['azurecr'],
    });
  }

  if (vaultInfo && adminUserEnabled) {
    resource.id.apply(async (id) => {
      //The Resource is not created in Azure yet.
      if (!id) return;
      //Only able to gert the secret once the resource is created.
      const keys = await registry.listRegistryCredentials({
        registryName: name,
        resourceGroupName: global.groupInfo.resourceGroupName,
      });

      addCustomSecret({
        name: urlKey,
        value: `https://${name}.azurecr.io`,
        vaultInfo,
        contentType: 'Container Registry',
        dependsOn: resource,
      });

      addCustomSecret({
        name: userNameKey,
        value: keys.username!,
        vaultInfo,
        contentType: 'Container Registry',
        dependsOn: resource,
      });

      addCustomSecret({
        name: primaryPasswordKey,
        formattedName: true,
        value: keys.passwords![0].value!,
        vaultInfo,
        contentType: 'Container Registry',
        dependsOn: resource,
      });

      addCustomSecret({
        name: secondaryPasswordKey,
        formattedName: true,
        value: keys.passwords![1].value!,
        vaultInfo,
        contentType: 'Container Registry',
        dependsOn: resource,
      });
    });
  }

  return {
    name,
    group,
    id: resource.id,
    instance: resource as registry.Registry,
  };
};
