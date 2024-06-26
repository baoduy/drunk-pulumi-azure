import { KeyVaultSecret } from "@azure/keyvault-secrets";
import * as storage from "@pulumi/azure-native/storage";
import { KeyVaultInfo, BasicResourceArgs, ResourceInfo } from "../types";
import { Input } from "@pulumi/pulumi";
import { getSecret, getEncryptionKeyOutput } from "../KeyVault/Helper";
import { isPrd } from "../Common/AzureEnv";
import cdnCreator from "./CdnEndpoint";
import {
  getConnectionName,
  getKeyName,
  getStorageName,
} from "../Common/Naming";
import { addCustomSecrets } from "../KeyVault/CustomHelper";
import Locker from "../Core/Locker";
import {
  createManagementRules,
  DefaultManagementRules,
  ManagementRules,
} from "./ManagementRules";
import { grantIdentityPermissions } from "../AzAd/Helper";

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
  /**Only available when static site using CDN*/
  securityResponseHeaders?: Record<string, string>;
  /** The CDN is automatic enabled when the customDomain is provided. However, turn this on to force to enable CDN regardless to customDomain. */
  forceUseCdn?: boolean;
  /** This option only able to enable once Account is created, and the Principal added to the Key Vault Read Permission Group */
  enableKeyVaultEncryption?: boolean;
};
export type StoragePolicyType = {
  keyExpirationPeriodInDays?: number;
  isBlobVersioningEnabled?: boolean;
  //blobSoftDeleteDays?: number;
  allowBlobPublicAccess?: boolean;
  //containerSoftDeleteDays?: number;
  //fileShareSoftDeleteDays?: number;
};

interface StorageProps extends BasicResourceArgs {
  customDomain?: string;
  allowsCors?: string[];
  //This is required for encryption key
  vaultInfo: KeyVaultInfo;

  /** The management rule applied to Storage level (all containers)*/
  defaultManagementRules?: Array<DefaultManagementRules>;

  containers?: Array<ContainerProps>;
  queues?: Array<string>;
  fileShares?: Array<string>;
  //appInsight?: AppInsightInfo;
  featureFlags?: StorageFeatureType;
  policies?: StoragePolicyType;
  network?: { subnetId?: Input<string>; ipAddresses?: Array<string> };
  lock?: boolean;
}

export type StorageResults = ResourceInfo & {
  instance: storage.StorageAccount;
  getConnectionString: (name?: string) => Promise<KeyVaultSecret | undefined>;
};

/** Storage Creator */
export default ({
  name,
  group,
  customDomain,
  allowsCors,
  vaultInfo,
  defaultManagementRules,
  containers = [],
  queues = [],
  fileShares = [],
  network,
  featureFlags = {},
  policies = { keyExpirationPeriodInDays: 365 },
  lock = true,
}: StorageProps): StorageResults => {
  name = getStorageName(name);

  const primaryKeyName = getKeyName(name, "primary");
  const secondaryKeyName = getKeyName(name, "secondary");
  const primaryConnectionKeyName = getConnectionName(name, "primary");
  const secondConnectionKeyName = getConnectionName(name, "secondary");
  const encryptionKey = featureFlags.enableKeyVaultEncryption
    ? getEncryptionKeyOutput(name, vaultInfo)
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
    accessTier: "Hot",

    isHnsEnabled: true,
    enableHttpsTrafficOnly: true,
    allowBlobPublicAccess: policies?.allowBlobPublicAccess,
    allowSharedKeyAccess: featureFlags.allowSharedKeyAccess,
    identity: { type: "SystemAssigned" },
    minimumTlsVersion: "TLS1_2",

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
          keySource: "Microsoft.KeyVault",
          keyVaultProperties: encryptionKey,
        }
      : undefined,

    sasPolicy: {
      expirationAction: storage.ExpirationAction.Log,
      sasExpirationPeriod: "00.00:30:00",
    },

    customDomain:
      customDomain && !featureFlags.enableStaticWebsite
        ? { name: customDomain, useSubDomainName: true }
        : undefined,

    // routingPreference: {
    //   routingChoice: enableStaticWebsite
    //     ? native.storage.RoutingChoice.InternetRouting
    //     : native.storage.RoutingChoice.MicrosoftRouting,
    //   publishInternetEndpoints: false,
    //   publishMicrosoftEndpoints: false,
    // },

    networkRuleSet: network
      ? {
          bypass: "Logging, Metrics",
          defaultAction: "Allow",

          virtualNetworkRules: network.subnetId
            ? [{ virtualNetworkResourceId: network.subnetId }]
            : undefined,

          ipRules: network.ipAddresses
            ? network.ipAddresses.map((i) => ({
                iPAddressOrRange: i,
                action: "Allow",
              }))
            : undefined,
        }
      : { defaultAction: "Allow" },
  });

  //Life Cycle Management
  if (defaultManagementRules) {
    createManagementRules({
      name,
      storageAccount: stg,
      group,
      rules: defaultManagementRules,
    });
  }

  if (lock) {
    Locker({ name, resource: stg });
  }

  //Enable Static Website for SPA
  if (featureFlags.enableStaticWebsite) {
    new storage.StorageAccountStaticWebsite(
      name,
      {
        accountName: stg.name,
        ...group,
        indexDocument: "index.html",
        error404Document: "index.html",
      },
      { dependsOn: stg },
    );
  }

  //Create Azure CDN if customDomain provided
  if (
    (featureFlags.enableStaticWebsite && customDomain) ||
    featureFlags.forceUseCdn
  ) {
    const origin = stg.name.apply((n) => `${n}.z23.web.core.windows.net`);
    cdnCreator({
      name,
      domainName: customDomain!,
      origin,
      cors: allowsCors,
      httpsEnabled: true,
      securityResponseHeaders: featureFlags.securityResponseHeaders,
    });
  }

  //Create Containers
  containers.map((c) => {
    const container = new storage.BlobContainer(c.name, {
      containerName: c.name.toLowerCase(),
      ...group,
      accountName: stg.name,
      //denyEncryptionScopeOverride: true,
      publicAccess: c.public ? "Blob" : "None",
    });

    if (c.managementRules) {
      createManagementRules({
        name,
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
    grantIdentityPermissions({
      name,
      vaultInfo,
      envRole: "readOnly",
      principalId: stg.identity.apply((s) => s!.principalId),
    });

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

    if (vaultInfo) {
      //Keys
      addCustomSecrets({
        vaultInfo,
        contentType: "Storage",
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
    resourceName: name,
    group,
    id: stg.id,
    instance: stg,
    getConnectionString: (name: string = primaryConnectionKeyName) =>
      getSecret({ name, nameFormatted: true, vaultInfo }),
  };
};
