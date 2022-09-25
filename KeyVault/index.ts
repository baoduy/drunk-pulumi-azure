import * as native from '@pulumi/azure-native';
import { input as inputs, enums } from '@pulumi/azure-native/types';
import {
  BasicMonitorArgs,
  ConventionProps,
  KeyVaultInfo,
  PrivateLinkProps,
  ResourceResultProps,
} from '../types';

import {
  currentServicePrincipal,
  defaultTags,
  subscriptionId,
  tenantId,
} from '../Common/AzureEnv';
import { createDiagnostic } from '../Logs/Helpers';
import { BasicResourceArgs } from './../types.d';
import { getKeyVaultName, getPrivateEndpointName } from '../Common/Naming';
import { addLegacyKey, addLegacySecret } from './LegacyHelper';
import { Input } from '@pulumi/pulumi';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import {
  grantVaultRbacPermission,
  PermissionProps,
  KeyVaultAdminPolicy,
  KeyVaultReadOnlyPolicy,
} from './VaultPermissions';

interface Props extends BasicResourceArgs {
  nameConvention?: ConventionProps | false;
  enableRbac?: boolean;
  /**The default-encryption-key, tenant-id va subscription-id will be added to the secrets and keys*/
  createDefaultValues?: boolean;
  permissions?: Array<PermissionProps>;
  network?: {
    ipAddresses?: Array<Input<string>>;
    subnetIds?: Array<Input<string>>;
  };
}

export default async ({
  name,
  nameConvention,
  group,
  enableRbac = true,
  createDefaultValues,
  permissions = new Array<PermissionProps>(),
  network,
  ...others
}: Props): Promise<
  ResourceResultProps<native.keyvault.Vault> & {
    toVaultInfo: () => KeyVaultInfo;
    addDiagnostic: (logInfo: BasicMonitorArgs) => Promise<void>;
    createPrivateLink: (
      props: PrivateLinkProps
    ) => Promise<native.network.PrivateEndpoint>;
  }
> => {
  const vaultName = getKeyVaultName(name, nameConvention);

  const accessPolicies =
    new Array<native.types.input.keyvault.AccessPolicyEntryArgs>();

  //Grant Access permission
  if (!enableRbac) {
    //Add current service principal in
    if (permissions.length <= 0) {
      permissions.push({
        objectId: currentServicePrincipal,
        permission: 'ReadWrite',
      });
    }

    permissions.forEach(({ objectId, applicationId, permission }) =>
      accessPolicies.push({
        objectId,
        applicationId,
        tenantId,
        permissions:
          permission === 'ReadOnly'
            ? KeyVaultReadOnlyPolicy
            : KeyVaultAdminPolicy,
      })
    );
  }

  const resource = new native.keyvault.Vault(vaultName, {
    vaultName,
    ...group,
    ...others,

    properties: {
      tenantId,
      sku: { name: 'standard', family: 'A' },
      createMode: 'default',

      enableRbacAuthorization: enableRbac,
      accessPolicies: !enableRbac ? accessPolicies : undefined,

      enablePurgeProtection: true,
      enableSoftDelete: true,
      softDeleteRetentionInDays: 7, //This is not important as pulumi auto restore and update the sift deleted.

      enabledForDeployment: true,
      enabledForDiskEncryption: true,

      networkAcls: network
        ? {
            bypass: 'AzureServices',
            defaultAction: enums.keyvault.NetworkRuleAction.Deny,

            ipRules: network.ipAddresses
              ? network.ipAddresses.map((i) => ({ value: i }))
              : [],

            virtualNetworkRules: network.subnetIds
              ? network.subnetIds.map((s) => ({ id: s }))
              : undefined,
          }
        : {
            bypass: 'AzureServices',
            defaultAction: enums.keyvault.NetworkRuleAction.Allow,
          },
    },

    tags: defaultTags,
  });

  //Grant RBAC permission
  if (enableRbac && permissions) {
    permissions.map((p, i) =>
      grantVaultRbacPermission({
        name: `${name}-${i}`,
        scope: resource.id,
        ...p,
      })
    );
  }

  //To Vault Info
  const toVaultInfo = () => ({ name: vaultName, group, id: resource.id });

  //Add Diagnostic
  const addDiagnostic = async (logInfo: BasicMonitorArgs) => {
    await createDiagnostic({
      name,
      targetResourceId: resource.id,
      ...logInfo,
      logsCategories: ['AuditEvent'],
    });
  };

  // Create Private Link
  const createPrivateLink = async (props: PrivateLinkProps) =>
    PrivateEndpoint({
      name: getPrivateEndpointName(name),
      group,
      ...props,
      resourceId: resource.id,
      privateDnsZoneName: 'privatelink.vaultcore.azure.net',
      linkServiceGroupIds: ['keyVault'],
    });

  if (createDefaultValues) {
    const vaultInfo = toVaultInfo();

    await addLegacySecret({
      name: 'tenant-id',
      value: tenantId,
      vaultInfo,
      contentType: 'KeyVault Default Values',
      dependsOn: resource,
    });
    await addLegacySecret({
      name: 'subscription-id',
      value: subscriptionId,
      vaultInfo,
      contentType: 'KeyVault Default Values',
      dependsOn: resource,
    });
    addLegacyKey({
      name: 'default-encryption-key',
      vaultInfo,
      dependsOn: resource,
    });
  }

  return {
    name: vaultName,
    resource: resource as native.keyvault.Vault,
    toVaultInfo,
    addDiagnostic,
    createPrivateLink,
  };
};
