import * as containerregistry from '@pulumi/azure-native/containerregistry';
import {
  DefaultResourceArgs,
  KeyVaultInfo,
  NetworkRulesProps,
  ResourceGroupInfo,
} from '../types';
import creator from '../Core/ResourceCreator';
import * as global from '../Common/GlobalEnv';
import {
  getAcrName,
  getPasswordName,
  getPrivateEndpointName,
} from '../Common/Naming';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { addCustomSecret } from '../KeyVault/CustomHelper';

interface Props extends DefaultResourceArgs {
  name: string;
  group?: ResourceGroupInfo;
  adminUserEnabled?: boolean;
  enableStorageAccount?: boolean;
  vaultInfo?: KeyVaultInfo;
  sku?: containerregistry.SkuName;
  /**Only support Premium sku*/
  network?: NetworkRulesProps;
}

/** The Azure Container Registry will be created at the GLobal Group.
 * Follow ReadMe file to setup the cleaning tasks for this Registry
 */
export default ({
  name,
  group = global.groupInfo,
  sku = containerregistry.SkuName.Basic,
  adminUserEnabled = true,
  lock = true,
  vaultInfo,
  network,
  ...others
}: Props) => {
  name = getAcrName(name);

  const urlKey = `${name}-url`;
  const userNameKey = `${name}-user-name`;
  const primaryPasswordKey = getPasswordName(name, 'primary');
  const secondaryPasswordKey = getPasswordName(name, 'secondary');

  const { resource, diagnostic, locker } = creator(
    containerregistry.Registry,
    {
      registryName: name,
      ...group,

      adminUserEnabled,
      lock,
      sku: { name: sku },
      networkRuleSet:
        sku === 'Premium' && network
          ? {
              defaultAction: containerregistry.DefaultAction.Allow,

              ipRules: network.ipAddresses
                ? network.ipAddresses.map((ip) => ({ iPAddressOrRange: ip }))
                : undefined,

              virtualNetworkRules: network.subnetId
                ? [{ virtualNetworkResourceId: network.subnetId }]
                : undefined,
            }
          : undefined,
      ...others,
    } as containerregistry.RegistryArgs & DefaultResourceArgs
  );

  if (sku === 'Premium' && network?.privateLink && network?.subnetId) {
    PrivateEndpoint({
      name: getPrivateEndpointName(name),
      group,
      privateDnsZoneName: 'privatelink.azurecr.io',
      subnetId: network.subnetId,
      ...network.privateLink,
      linkServiceGroupIds: ['azurecr'],
      resourceId: resource.id,
    });
  }

  if (vaultInfo && adminUserEnabled) {
    resource.id.apply(async (id) => {
      //The Resource is not created in Azure yet.
      if (!id) return;
      //Only able to gert the secret once the resource is created.
      const keys = await containerregistry.listRegistryCredentials({
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
    registry: resource as containerregistry.Registry,
    vaultKeyNames: {
      userNameKey,
      primaryPasswordKey,
      secondaryPasswordKey,
      urlKey,
    },
    locker,
    diagnostic,
  };
};
