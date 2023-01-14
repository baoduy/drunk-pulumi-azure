import * as native from '@pulumi/azure-native';
import { enums } from '@pulumi/azure-native/types';
import * as azuread from '@pulumi/azuread';
import { Input } from '@pulumi/pulumi';

import GroupRole from '../AzAd/Role';
import { currentEnv, currentServicePrincipal, defaultTags, subscriptionId, tenantId } from '../Common/AzureEnv';
import { getKeyVaultName, getPrivateEndpointName } from '../Common/Naming';
import { createDiagnostic } from '../Logs/Helpers';
import { BasicMonitorArgs, ConventionProps, PrivateLinkProps } from '../types';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { BasicResourceArgs } from './../types.d';
import { addCustomSecret } from './CustomHelper';
import { addLegacyKey } from './LegacyHelper';
import { grantVaultRbacPermission, KeyVaultAdminPolicy, KeyVaultReadOnlyPolicy, PermissionProps } from './VaultPermissions';

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
}: Props) => {
  const vaultName = getKeyVaultName(name, nameConvention);

  //Permission Groups
  const readOnlyGroup =await GroupRole({
    env: currentEnv,
    appName: `${name}-vault`,
    roleName: "ReadOnly",
  });
  const adminGroup = await GroupRole({
    env: currentEnv,
    appName: `${name}-vault`,
    roleName: "Admin",
  });

  //Add current service principal in
  if (permissions.length <= 0) {
    permissions.push({
      objectId: currentServicePrincipal,
      permission: "ReadWrite",
    });
  }

  //Add Permission to Groups
  permissions.forEach(
    ({ objectId, applicationId, permission }, index) =>
      new azuread.GroupMember(`${name}-${permission}-${index}`, {
        groupObjectId:
          permission === "ReadOnly"
            ? readOnlyGroup.objectId
            : adminGroup.objectId,
        memberObjectId: objectId ?? applicationId,
      })
  );

  const accessPolicies =
    new Array<native.types.input.keyvault.AccessPolicyEntryArgs>();

  //Grant Access permission
  if (!enableRbac) {
    accessPolicies.push({
      objectId: readOnlyGroup.objectId,
      tenantId,
      permissions: KeyVaultReadOnlyPolicy,
    });
    accessPolicies.push({
      objectId: adminGroup.objectId,
      tenantId,
      permissions: KeyVaultAdminPolicy,
    });
  }

  const resource = new native.keyvault.Vault(vaultName, {
    vaultName,
    ...group,
    ...others,

    properties: {
      tenantId,
      sku: { name: "standard", family: "A" },
      createMode: "default",

      enableRbacAuthorization: enableRbac,
      accessPolicies: !enableRbac ? accessPolicies : undefined,

      enablePurgeProtection: true,
      enableSoftDelete: true,
      softDeleteRetentionInDays: 7, //This is not important as pulumi auto restore and update the sift deleted.

      enabledForDeployment: true,
      enabledForDiskEncryption: true,

      networkAcls: network
        ? {
            bypass: "AzureServices",
            defaultAction: enums.keyvault.NetworkRuleAction.Deny,

            ipRules: network.ipAddresses
              ? network.ipAddresses.map((i) => ({ value: i }))
              : [],

            virtualNetworkRules: network.subnetIds
              ? network.subnetIds.map((s) => ({ id: s }))
              : undefined,
          }
        : {
            bypass: "AzureServices",
            defaultAction: enums.keyvault.NetworkRuleAction.Allow,
          },
    },

    tags: defaultTags,
  });

  //Grant RBAC permission
  if (enableRbac && permissions) {
    await grantVaultRbacPermission({
      name: `${name}-ReadOnlyGroup`,
      scope: resource.id,
      objectId: readOnlyGroup.objectId,
      permission: "ReadOnly",
      principalType: "Group",
    });
    await grantVaultRbacPermission({
      name: `${name}-AdminGroup`,
      scope: resource.id,
      objectId: adminGroup.objectId,
      permission: "ReadWrite",
      principalType: "Group",
    });
  }

  //To Vault Info
  const toVaultInfo = () => ({ name: vaultName, group, id: resource.id });

  //Add Diagnostic
  const addDiagnostic = (logInfo: BasicMonitorArgs) =>
    createDiagnostic({
      name,
      targetResourceId: resource.id,
      ...logInfo,
      logsCategories: ["AuditEvent"],
    });

  // Create Private Link
  const createPrivateLink = (props: PrivateLinkProps) =>
    PrivateEndpoint({
      name: getPrivateEndpointName(name),
      group,
      ...props,
      resourceId: resource.id,
      privateDnsZoneName: "privatelink.vaultcore.azure.net",
      linkServiceGroupIds: ["keyVault"],
    });

  if (createDefaultValues) {
    const vaultInfo = toVaultInfo();

    addCustomSecret({
      name: "tenant-id",
      value: tenantId,
      vaultInfo,
      contentType: "KeyVault Default Values",
      dependsOn: resource,
    });

    addCustomSecret({
      name: "subscription-id",
      value: subscriptionId,
      vaultInfo,
      contentType: "KeyVault Default Values",
      dependsOn: resource,
    });

    await addLegacyKey({
      name: "default-encryption-key",
      vaultInfo,
      dependsOn: resource,
    });
  }

  return {
    name: vaultName,
    vault: resource as native.keyvault.Vault,
    readOnlyGroup,
    adminGroup,
    toVaultInfo,
    addDiagnostic,
    createPrivateLink,
  };
};
