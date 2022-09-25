import * as documentdb from "@pulumi/azure-native/documentdb";
import * as pulumi from "@pulumi/pulumi";
import { getCosmosDbName } from "../Common/Naming";
import { DefaultResourceArgs, KeyVaultInfo, ResourceGroupInfo } from "../types";
import ResourceCreator from "../Core/ResourceCreator";
import { defaultTags, isPrd } from "../Common/AzureEnv";
import { createThreatProtection } from "../Logs/Helpers";
import { Input } from "@pulumi/pulumi";
import { addLegacySecret } from "../KeyVault/LegacyHelper";

interface CosmosDbProps {
  name: string;
  group: ResourceGroupInfo;
  vaultInfo?: KeyVaultInfo;
  locations?: string[];
  enableMultipleWriteLocations?: boolean;
  capabilities?: Array<"EnableCassandra" | "EnableTable" | "EnableGremlin">;
  publicNetworkAccess?: boolean;
  allowAzureServicesAccess?: boolean;

  subnetIds: Array<Input<string>>;
  ipAddresses: Array<Input<string>>;

  sqlDbs?: Array<{
    name: string;
    containers?: Array<{
      name: string;

      partitionKeyPath: string;
      /** auto expired items in seconds*/
      ttl?: number;
    }>;
  }>;
  //allowPortalAccess?: boolean;
  //mongoNames?: Array<string>;
  //sqlDbContainers?: Array<string>;
}

export default async ({
  name,
  group,
  vaultInfo,
  locations,
  capabilities = ["EnableTable"],
  enableMultipleWriteLocations = false,
  publicNetworkAccess = false,
  allowAzureServicesAccess = true,
  subnetIds,
  ipAddresses,

  sqlDbs,
}: CosmosDbProps) => {
  name = getCosmosDbName(name);

  const { resource } = await ResourceCreator(documentdb.DatabaseAccount, {
    accountName: name,
    ...group,
    databaseAccountOfferType: documentdb.DatabaseAccountOfferType.Standard,

    kind: documentdb.DatabaseAccountKind.GlobalDocumentDB,
    identity: { type: "SystemAssigned" },

    capabilities,
    locations: locations || [group.location],

    backupPolicy: {
      type: "Periodic",
      periodicModeProperties: {
        backupIntervalInMinutes: 30,
        backupRetentionIntervalInHours: 4,
      },
    },

    enableAutomaticFailover: isPrd,
    enableAnalyticalStorage: false,
    enableFreeTier: true,
    enableMultipleWriteLocations,

    consistencyPolicy: {
      defaultConsistencyLevel:
        documentdb.DefaultConsistencyLevel.BoundedStaleness,
      maxIntervalInSeconds: 60 * 60, //1 hours
      maxStalenessPrefix: 100000,
    },

    publicNetworkAccess: publicNetworkAccess
      ? documentdb.PublicNetworkAccess.Enabled
      : documentdb.PublicNetworkAccess.Disabled,

    isVirtualNetworkFilterEnabled: !publicNetworkAccess,
    networkAclBypass: allowAzureServicesAccess
      ? documentdb.NetworkAclBypass.AzureServices
      : documentdb.NetworkAclBypass.None,

    virtualNetworkRules: subnetIds
      ? subnetIds.map((s) => ({
          id: s,
          ignoreMissingVNetServiceEndpoint: true,
        }))
      : undefined,

    ipRules: ipAddresses
      ? ipAddresses.map((i) => ({ ipAddressOrRange: i }))
      : undefined,

    //keyVaultKeyId: encryptKey?.properties.id,
    monitoring: {
      logsCategories: [
        "CassandraRequests",
        "PartitionKeyStatistics",
        "ControlPlaneRequests",
        "MongoRequests",
        "QueryRuntimeStatistics",
        "GremlinRequests",
        "PartitionKeyRUConsumption",
        "DataPlaneRequests",
      ],
      metricsCategories: ["Requests"],
    },
    tags: defaultTags,
  } as documentdb.DatabaseAccountArgs & DefaultResourceArgs);

  //Thread Protection
  createThreatProtection({
    name,
    targetResourceId: resource.id,
  });

  //Vault variables
  if (vaultInfo) {
    const keys = resource.id.apply(async (id) => {
      if (!id) return undefined;
      return await documentdb.listDatabaseAccountKeys({
        accountName: name,
        ...group,
      });
    });
    //keys.apply((k) => console.log(name, k));

    //Keys
    // await addLegacySecret({
    //   name: `${name}-PrimaryKey`,
    //   value: pulumi
    //     .all([account.primaryKey, account.primaryMasterKey])
    //     .apply(([a, b]) => a || b),
    //   vaultInfo,
    //   contentType: 'CosmosDb Key',
    // });

    // await addLegacySecret({
    //   name: `${name}-PrimaryReadonlyKey`,
    //   value: pulumi
    //     .all([account.primaryReadonlyKey, account.primaryReadonlyMasterKey])
    //     .apply(([a, b]) => a || b),
    //   vaultInfo,
    //   contentType: 'CosmosDb Key',
    // });

    // await addLegacySecret({
    //   name: `${name}-SecondaryKey`,
    //   value: pulumi
    //     .all([account.secondaryKey, account.secondaryMasterKey])
    //     .apply(([a, b]) => a || b),
    //   vaultInfo,
    //   contentType: 'CosmosDb Key',
    // });

    // await addLegacySecret({
    //   name: `${name}-SecondaryReadonlyKey`,
    //   value: pulumi
    //     .all([account.secondaryReadonlyKey, account.secondaryReadonlyMasterKey])
    //     .apply(([a, b]) => a || b),
    //   vaultInfo,
    //   contentType: 'CosmosDb Key',
    // });

    // //Connection String
    // await addLegacySecret({
    //   name: `${name}-PrimaryConn`,
    //   value: conns.apply((c) => c[0].connectionString),
    //   vaultInfo,
    //   contentType: 'CosmosDb ConnectionString',
    // });

    // await addLegacySecret({
    //   name: `${name}-SecondaryConn`,
    //   value: conns.apply((c) => c[1].connectionString),
    //   vaultInfo,
    //   contentType: 'CosmosDb ConnectionString',
    // });

    // await addLegacySecret({
    //   name: `${name}-PrimaryReadonlyConn`,
    //   value: account.primaryReadonlyMasterKey.apply(
    //     (k) =>
    //       `AccountEndpoint=https://${name}.documents.azure.com:443/;AccountKey=${k};`
    //   ),
    //   vaultInfo,
    //   contentType: 'CosmosDb ConnectionString',
    // });

    // await addLegacySecret({
    //   name: `${name}-SecondaryReadonlyConn`,
    //   value: account.secondaryReadonlyMasterKey.apply(
    //     (k) =>
    //       `AccountEndpoint=https://${name}.documents.azure.com:443/;AccountKey=${k};`
    //   ),
    //   vaultInfo,
    //   contentType: 'CosmosDb ConnectionString',
    // });
  }

  //Database and Containers
  if (sqlDbs) {
    sqlDbs.forEach((db) => {
      const database = new documentdb.SqlResourceSqlDatabase(
        db.name,
        {
          databaseName: db.name,
          accountName: name,
          resource: { id: db.name },
          ...group,
        },
        { dependsOn: resource }
      );

      if (db.containers) {
        db.containers.forEach(
          (c) =>
            new documentdb.SqlResourceSqlContainer(`${db.name}-${c.name}`, {
              accountName: name,
              ...group,
              databaseName: db.name,
              containerName: c.name,
              resource: {
                id: c.name,
                defaultTtl: c.ttl,
                partitionKey: { paths: [c.partitionKeyPath || "/id"] },
              },
            })
        );
      }
    });
  }

  return resource;
};
