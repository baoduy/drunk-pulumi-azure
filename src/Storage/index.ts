import { KeyVaultSecret } from '@azure/keyvault-secrets';
import * as storage from '@pulumi/azure-native/storage';
import { createEnvRoles } from '../AzAd/EnvRoles';
import {
  BasicEncryptResourceArgs,
  PrivateLinkPropsType,
  ResourceInfo,
} from '../types';
import { Input } from '@pulumi/pulumi';
import { getEncryptionKeyOutput, getSecret } from '../KeyVault/Helper';
import { isPrd } from '../Common';
import { getConnectionName, getKeyName, getStorageName } from '../Common';
import { addCustomSecrets } from '../KeyVault/CustomHelper';
import Locker from '../Core/Locker';
import privateEndpoint from '../VNet/PrivateEndpoint';
import {
  createManagementRules,
  DefaultManagementRules,
  ManagementRules,
} from './ManagementRules';
import { grantIdentityPermissions } from '../AzAd/Helper';

export type ContainerProps = {
  name: string;
  public?: boolean;
  /** The management rule applied to Container level*/
  managementRules?: Array<ManagementRules>;
};
export type StorageFeatureType = {
  allowSharedKeyAccess?: boolean;
  /** Enable this storage as static website. */
  enableStaticWebsite?: boolean;
  allowCrossTenantReplication?: boolean;
  isSftpEnabled?: boolean;
};
export type StoragePolicyType = {
  keyExpirationPeriodInDays?: number;
  isBlobVersioningEnabled?: boolean;
  allowBlobPublicAccess?: boolean;
  /** The management rule applied to Storage level (all containers)*/
  defaultManagementRules?: Array<DefaultManagementRules>;
};
export type StorageNetworkType = {
  defaultByPass?: 'AzureServices' | 'None';
  vnet?: Array<{ subnetId?: Input<string>; ipAddresses?: Array<string> }>;
  privateEndpoint?: Omit<PrivateLinkPropsType, 'type'> & {
    type: 'blob' | 'table' | 'queue' | 'file' | 'web' | 'dfs';
  };
};
interface StorageProps extends BasicEncryptResourceArgs {
  containers?: Array<ContainerProps>;
  queues?: Array<string>;
  fileShares?: Array<string>;
  features?: StorageFeatureType;
  policies?: StoragePolicyType;
  network?: StorageNetworkType;
  lock?: boolean;
}

export type StorageResults = ResourceInfo & {
  instance: storage.StorageAccount;
  getConnectionString?: (name?: string) => Promise<KeyVaultSecret | undefined>;
};

/** Storage Creator */
export default ({
  name,
  group,
  vaultInfo,
  enableEncryption,
  envRoles,
  containers = [],
  queues = [],
  fileShares = [],
  network,
  features = {},
  policies = { keyExpirationPeriodInDays: 365 },
  lock = true,
}: StorageProps): StorageResults => {
  name = getStorageName(name);

  const primaryKeyName = getKeyName(name, 'primary');
  const secondaryKeyName = getKeyName(name, 'secondary');
  const primaryConnectionKeyName = getConnectionName(name, 'primary');
  const secondConnectionKeyName = getConnectionName(name, 'secondary');
  const encryptionKey = enableEncryption
    ? getEncryptionKeyOutput({ name, vaultInfo })
    : undefined;

  //To fix identity issue then using this approach https://github.com/pulumi/pulumi-azure-native/blob/master/examples/keyvault/index.ts
  const stg = new storage.StorageAccount(name, {
    accountName: name,
    ...group,

    kind: storage.Kind.StorageV2,
    sku: {
      name: isPrd
        ? storage.SkuName.Standard_ZRS //Zone redundant in PRD
        : storage.SkuName.Standard_LRS,
    },
    accessTier: 'Hot',

    isHnsEnabled: true,
    enableHttpsTrafficOnly: true,
    allowBlobPublicAccess: Boolean(policies?.allowBlobPublicAccess),
    allowSharedKeyAccess: Boolean(features.allowSharedKeyAccess),
    allowedCopyScope: network?.privateEndpoint ? 'PrivateLink' : 'AAD',
    defaultToOAuthAuthentication: !Boolean(features.allowSharedKeyAccess),
    isSftpEnabled: Boolean(features.isSftpEnabled),

    allowCrossTenantReplication: Boolean(features.allowCrossTenantReplication),
    identity: { type: 'SystemAssigned' },
    minimumTlsVersion: 'TLS1_2',

    //1 Year Months
    keyPolicy: {
      keyExpirationPeriodInDays: policies.keyExpirationPeriodInDays || 365,
    },

    encryption: encryptionKey
      ? {
          services: {
            blob: {
              enabled: true,
              keyType: storage.KeyType.Account,
            },
            file: {
              enabled: true,
              keyType: storage.KeyType.Account,
            },
          },
          keySource: 'Microsoft.KeyVault',
          keyVaultProperties: encryptionKey,
        }
      : undefined,

    sasPolicy: {
      expirationAction: storage.ExpirationAction.Log,
      sasExpirationPeriod: '00.00:30:00',
    },

    publicNetworkAccess: network?.privateEndpoint ? 'Disabled' : 'Enabled',
    networkRuleSet: {
      bypass: network?.defaultByPass ?? 'AzureServices', // Logging,Metrics,AzureServices or None
      defaultAction: 'Allow',

      virtualNetworkRules: network?.vnet
        ? network.vnet
            .filter((v) => v.subnetId)
            .map((v) => ({
              virtualNetworkResourceId: v.subnetId!,
            }))
        : undefined,

      ipRules: network?.vnet
        ? network.vnet
            .filter((v) => v.ipAddresses)
            .flatMap((s) => s.ipAddresses)
            .map((i) => ({
              iPAddressOrRange: i!,
              action: 'Allow',
            }))
        : undefined,
    },
  });

  if (network?.privateEndpoint) {
    //Create Private Endpoints
    privateEndpoint({
      ...network.privateEndpoint,
      resourceInfo: { name, group, id: stg.id },
      privateDnsZoneName: `privatelink.${network.privateEndpoint.type}.core.windows.net`,
      linkServiceGroupIds: [network.privateEndpoint.type],
    });
  }
  //Life Cycle Management
  if (policies?.defaultManagementRules) {
    createManagementRules({
      name,
      group,
      storageAccount: stg,
      rules: policies.defaultManagementRules,
    });
  }

  //Lock the resources
  if (lock) {
    Locker({ name, resource: stg });
  }

  //Enable Static Website for SPA
  if (features.enableStaticWebsite) {
    new storage.StorageAccountStaticWebsite(
      name,
      {
        accountName: stg.name,
        ...group,
        indexDocument: 'index.html',
        error404Document: 'index.html',
      },
      { dependsOn: stg },
    );
  }

  //Create Containers
  containers.map((c) => {
    const container = new storage.BlobContainer(c.name, {
      containerName: c.name.toLowerCase(),
      ...group,
      accountName: stg.name,
      //denyEncryptionScopeOverride: true,
      publicAccess: c.public ? 'Blob' : 'None',
    });

    if (c.managementRules) {
      createManagementRules({
        name: `${name}-${c.name.toLowerCase()}`,
        storageAccount: stg,
        group,
        containerNames: [container.name],
        rules: c.managementRules,
      });
    }
    return container;
  });

  //Create Queues
  queues.map((q) => {
    new storage.Queue(q, {
      queueName: q.toLowerCase(),
      accountName: stg.name,
      ...group,
    });
  });

  //File Share
  fileShares.map((s) => {
    new storage.FileShare(s, {
      shareName: s.toLowerCase(),
      accountName: stg.name,
      ...group,
    });
  });

  //Add Key to
  stg.id.apply(async (id) => {
    if (!id) return;

    //Allows to Read Key Vault
    if (envRoles)
      envRoles.addMember(
        'readOnly',
        stg.identity.apply((s) => s!.principalId),
      );

    //Add connection into Key vault
    if (vaultInfo && features?.allowSharedKeyAccess) {
      const keys = (
        await storage.listStorageAccountKeys({
          accountName: name,
          resourceGroupName: group.resourceGroupName,
        })
      ).keys.map((k) => ({
        name: k.keyName,
        key: k.value,
        connectionString: `DefaultEndpointsProtocol=https;AccountName=${name};AccountKey=${k.value};EndpointSuffix=core.windows.net`,
      }));

      //Keys
      addCustomSecrets({
        vaultInfo,
        contentType: 'Storage',
        formattedName: true,
        items: [
          {
            name: primaryKeyName,
            value: keys[0].key,
          },
          {
            name: secondaryKeyName,
            value: keys[1].key,
          },
          {
            name: primaryConnectionKeyName,
            value: keys[0].connectionString,
          },
          {
            name: secondConnectionKeyName,
            value: keys[1].connectionString,
          },
        ],
      });
    }
  });

  return {
    name,
    group,
    id: stg.id,
    instance: stg,
    getConnectionString: vaultInfo
      ? (name: string = primaryConnectionKeyName) =>
          getSecret({ name, nameFormatted: true, vaultInfo })
      : undefined,
  };
};
