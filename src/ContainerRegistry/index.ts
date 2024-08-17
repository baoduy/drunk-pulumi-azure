import * as registry from '@pulumi/azure-native/containerregistry';
import {
  NetworkPropsType,
  ResourceInfoWithInstance,
  BasicResourceArgs,
} from '../types';
import * as global from '../Common/GlobalEnv';
import { naming } from '../Common';
import PrivateEndpoint from '../VNet/PrivateEndpoint';

interface Props extends BasicResourceArgs {
  //vaultInfo?: KeyVaultInfo;
  sku?: registry.SkuName | string;
  policies?: { retentionDay: number };
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
  //vaultInfo,
  policies,
  network,
  dependsOn,
  ignoreChanges,
}: Props): ResourceInfoWithInstance<registry.Registry> => {
  name = naming.getAcrName(name);

  const resource = new registry.Registry(
    name,
    {
      registryName: name,
      ...group,

      sku: { name: sku },
      //This is for encryption
      identity: { type: registry.ResourceIdentityType.SystemAssigned },

      adminUserEnabled: false,
      dataEndpointEnabled: false,
      policies:
        sku === 'Premium'
          ? {
              exportPolicy: {
                status: registry.ExportPolicyStatus.Disabled,
              },
              quarantinePolicy: { status: registry.PolicyStatus.Enabled },
              retentionPolicy: {
                days: policies?.retentionDay ?? 90,
                status: registry.PolicyStatus.Enabled,
              },
              trustPolicy: {
                status: registry.PolicyStatus.Enabled,
                type: registry.TrustPolicyType.Notary,
              },
            }
          : undefined,

      publicNetworkAccess: network?.privateLink ? 'Disabled' : 'Enabled',
      networkRuleBypassOptions: network?.privateLink ? 'None' : 'AzureServices',
      zoneRedundancy: sku === 'Premium' ? 'Enabled' : 'Disabled',

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
      ...network.privateLink,
      resourceInfo: { name, group, id: resource.id },
      privateDnsZoneName: 'privatelink.azurecr.io',
      linkServiceGroupIds: network.privateLink.type
        ? [network.privateLink.type]
        : ['azurecr'],
    });
  }

  return {
    name,
    group,
    id: resource.id,
    instance: resource as registry.Registry,
  };
};
