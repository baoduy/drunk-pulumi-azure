import * as storage from '@pulumi/azure-native/storage';
import env from '../env';
import {
  BasicEncryptResourceArgs,
  PrivateLinkPropsType,
  ResourceInfoWithInstance,
} from '../types';
import { Input } from '@pulumi/pulumi';
import { addEncryptKey } from '../KeyVault/Helper';
import { isPrd, naming } from '../Common';
import { addCustomSecrets } from '../KeyVault/CustomHelper';
import { Locker } from '../Core/Locker';
import { StoragePrivateLink } from '../VNet';
import {
  createManagementRules,
  DefaultManagementRules,
  ManagementRules,
} from './ManagementRules';

export type ContainerProps = {
  name: string;
  public?: boolean;
  /** The management rule applied to Container level*/
  managementRules?: Array<ManagementRules>;
};
export type StorageFeatureType = {
  allowSharedKeyAccess?: boolean;
  allowBlobPublicAccess?: boolean;
  /** Enable this storage as static website. */
  enableStaticWebsite?: boolean;
  allowCrossTenantReplication?: boolean;

  isSftpEnabled?: boolean;
};
export type StoragePolicyType = {
  keyExpirationPeriodInDays?: number;
  isBlobVersioningEnabled?: boolean;
  blobProperties?: Omit<
    storage.BlobServicePropertiesArgs,
    'blobServicesName' | 'resourceGroupName' | 'accountName'
  >;
  /** The management rule applied to Storage level (all containers)*/
  defaultManagementRules?: Array<DefaultManagementRules>;
};

export type StorageEndpointTypes =
  | 'blob'
  | 'table'
  | 'queue'
  | 'file'
  | 'web'
  | 'dfs';

export type StorageNetworkType = {
  defaultByPass?: 'AzureServices' | 'None';
  vnet?: Array<{ subnetId?: Input<string>; ipAddresses?: Array<string> }>;
  privateEndpoint?: Omit<PrivateLinkPropsType, 'type'> & {
    type: StorageEndpointTypes | StorageEndpointTypes[];
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

/** Storage Creator */
function Storage({
  name,
  group,
  vaultInfo,
  enableEncryption,
  envRoles,
  envUIDInfo,
  containers = [],
  queues = [],
  fileShares = [],
  network,
  features = {},
  policies = { keyExpirationPeriodInDays: 365 },
  lock = true,
  dependsOn,
  ignoreChanges = [],
}: StorageProps): ResourceInfoWithInstance<storage.StorageAccount> {
  name = naming.getStorageName(name);

  const encryptionKey = enableEncryption
    ? addEncryptKey(name, vaultInfo!)
    : undefined;
  const allowSharedKeyAccess =
    features.allowSharedKeyAccess || features.enableStaticWebsite;

  //To fix identity issue then using this approach https://github.com/pulumi/pulumi-azure-native/blob/master/examples/keyvault/index.ts
  const stg = new storage.StorageAccount(
    name,
    {
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
      allowBlobPublicAccess: Boolean(features?.allowBlobPublicAccess),
      allowSharedKeyAccess,
      allowedCopyScope: network?.privateEndpoint ? 'PrivateLink' : 'AAD',
      defaultToOAuthAuthentication: !allowSharedKeyAccess,
      isSftpEnabled: Boolean(features.isSftpEnabled),

      allowCrossTenantReplication: Boolean(
        features.allowCrossTenantReplication,
      ),

      identity: {
        type: envUIDInfo
          ? storage.IdentityType.SystemAssigned_UserAssigned
          : storage.IdentityType.SystemAssigned,
        //all uuid must assign here before use
        userAssignedIdentities: envUIDInfo ? [envUIDInfo.id] : undefined,
      },

      minimumTlsVersion: 'TLS1_2',
      //1 Year Months
      keyPolicy: {
        keyExpirationPeriodInDays: policies.keyExpirationPeriodInDays || 365,
      },
      encryption: encryptionKey
        ? {
            keySource: storage.KeySource.Microsoft_Keyvault,
            keyVaultProperties: encryptionKey,
            requireInfrastructureEncryption: true,
            encryptionIdentity: envUIDInfo
              ? {
                  //encryptionFederatedIdentityClientId?: pulumi.Input<string>;
                  encryptionUserAssignedIdentity: envUIDInfo!.id,
                }
              : undefined,

            services: {
              blob: {
                enabled: true,
                //keyType: storage.KeyType.Account,
              },
              file: {
                enabled: true,
                //keyType: storage.KeyType.Account,
              },
              queue: {
                enabled: true,
                //keyType: storage.KeyType.Account,
              },
              table: {
                enabled: true,
                //keyType: storage.KeyType.Account,
              },
            },
          }
        : //Default infra encryption
          {
            keySource: storage.KeySource.Microsoft_Storage,
            requireInfrastructureEncryption: true,
          },

      sasPolicy: {
        expirationAction: storage.ExpirationAction.Log,
        sasExpirationPeriod: '00.00:30:00',
      },
      //isLocalUserEnabled: false,
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
    },
    {
      dependsOn,
      ignoreChanges: [
        ...ignoreChanges,
        'encryption.requireInfrastructureEncryption',
      ],
    },
  );
  //Allows to Read Key Vault
  envRoles?.addIdentity('readOnly', stg.identity);

  if (network?.privateEndpoint) {
    const linkTypes = Array.isArray(network.privateEndpoint.type)
      ? network.privateEndpoint.type
      : [network.privateEndpoint.type];

    //Create Private Endpoints
    linkTypes.map((type) =>
      StoragePrivateLink(type, {
        ...network.privateEndpoint!,
        privateIpAddress:
          type === 'web'
            ? network.privateEndpoint?.privateIpAddress
            : undefined,
        resourceInfo: { name, group, id: stg.id },
        dependsOn: stg,
      }),
    );
  }

  //Life Cycle Management
  const props = policies?.blobProperties
    ? new storage.BlobServiceProperties(
        name,
        {
          ...group,
          accountName: stg.name,
          blobServicesName: 'default',
          ...policies.blobProperties,
        },
        { dependsOn: stg },
      )
    : undefined;

  if (policies?.defaultManagementRules) {
    createManagementRules({
      name,
      group,
      storageAccount: stg,
      rules: policies.defaultManagementRules,
      dependsOn: props,
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

    //Add connection into Key vault
    if (vaultInfo) {
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
        contentType: `Storage: ${name}`,
        items: env.DPA_CONN_ENABLE_SECONDARY
          ? [
              {
                name: `${name}-key-primary`,
                value: keys[0].key,
              },
              {
                name: `${name}-key-secondary`,
                value: keys[1].key,
              },
              {
                name: `${name}-conn-primary`,
                value: keys[0].connectionString,
              },
              {
                name: `${name}-conn-secondary`,
                value: keys[1].connectionString,
              },
            ]
          : [
              {
                name: `${name}-key`,
                value: keys[0].key,
              },

              {
                name: `${name}-conn`,
                value: keys[0].connectionString,
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
  };
}

export default Storage;
