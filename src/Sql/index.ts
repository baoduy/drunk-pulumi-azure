import * as sql from '@pulumi/azure-native/sql';
import { all, Input, interpolate, Output } from '@pulumi/pulumi';
import { FullSqlDbPropsType } from '../Builder';
import { getEncryptionKeyOutput } from '../KeyVault/Helper';
import { EnvRolesResults } from '../AzAd/EnvRoles';
import { roleAssignment } from '../AzAd/RoleAssignment';
import { isPrd, subscriptionId, tenantId } from '../Common/AzureEnv';
import { getElasticPoolName, getSqlServerName } from '../Common';
import {
  BasicResourceArgs,
  KeyVaultInfo,
  NetworkPropsType,
  ResourceInfo,
  ResourceInfoWithInstance,
} from '../types';
import { convertToIpRange } from '../VNet/Helper';
import privateEndpointCreator from '../VNet/PrivateEndpoint';
import sqlDbCreator, { SqlDbSku } from './SqlDb';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { grantIdentityPermissions } from '../AzAd/Helper';

type ElasticPoolCapacityProps = 50 | 100 | 200 | 300 | 400 | 800 | 1200;

interface ElasticPoolProps extends BasicResourceArgs {
  sqlName: Output<string>;
  /** Minimum is 50 Gd*/
  maxSizeBytesGb?: number;
  sku?: { name: 'Standard' | 'Basic'; capacity: ElasticPoolCapacityProps };
}

const createElasticPool = ({
  group,
  name,
  sqlName,
  //Minimum is 50 GD
  maxSizeBytesGb = 50,
  sku = { name: isPrd ? 'Standard' : 'Basic', capacity: 50 },
}: ElasticPoolProps): ResourceInfoWithInstance<sql.ElasticPool> => {
  //Create Sql Elastic
  const elasticName = getElasticPoolName(name);

  const ep = new sql.ElasticPool(elasticName, {
    elasticPoolName: elasticName,
    serverName: sqlName,
    ...group,

    maxSizeBytes: isPrd ? maxSizeBytesGb * 1024 * 1024 * 1024 : undefined,
    sku: {
      name: `${sku.name}Pool`,
      tier: sku.name,
      capacity: sku.capacity,
    },
    perDatabaseSettings: {
      minCapacity: 0,
      maxCapacity: sku.name === 'Basic' ? 5 : sku.capacity,
    },
    zoneRedundant: isPrd,
    //licenseType: sql.ElasticPoolLicenseType.BasePrice,
    //zoneRedundant: isPrd,
  });

  return { name: elasticName, group, id: ep.id, instance: ep };
};

export type SqlAuthType = {
  envRoles?: EnvRolesResults;
  azureAdOnlyAuthentication?: boolean;
  adminLogin: Input<string>;
  password: Input<string>;
};

export type SqlNetworkType = NetworkPropsType & {
  //Enable this will add 0.0.0.0 to 255.255.255.255 to the DB whitelist
  acceptAllPublicConnect?: boolean;
};

export type SqlElasticPoolType = {
  name: 'Standard' | 'Basic';
  capacity: ElasticPoolCapacityProps;
};

export type SqlResults = ResourceInfo & {
  resource: sql.Server;
  elasticPool?: ResourceInfoWithInstance<sql.ElasticPool>;
  databases?: Record<string, ResourceInfoWithInstance<sql.Database>>;
};

export type SqlVulnerabilityAssessmentType = {
  alertEmails: Array<string>;
  logStorageId: Input<string>;
  storageAccessKey: Input<string>;
  storageEndpoint: Input<string>;
};

interface Props extends BasicResourceArgs {
  vaultInfo?: KeyVaultInfo;
  enableEncryption?: boolean;
  /** if Auth is not provided it will be auto generated */
  auth: SqlAuthType;
  elasticPool?: SqlElasticPoolType;
  databases?: Record<string, FullSqlDbPropsType>;

  network?: SqlNetworkType;
  vulnerabilityAssessment?: SqlVulnerabilityAssessmentType;
}

export default ({
  name,
  auth,
  group,
  enableEncryption,
  elasticPool,
  databases,
  vaultInfo,
  network,
  vulnerabilityAssessment,
  ignoreChanges = [
    'administratorLogin',
    'administrators',
    'resourceGroupName',
    'location',
  ],
}: Props): SqlResults => {
  const sqlName = getSqlServerName(name);
  const encryptKey = enableEncryption
    ? getEncryptionKeyOutput(name, vaultInfo)
    : undefined;

  const adminGroup = auth.envRoles?.contributor;

  if (auth.azureAdOnlyAuthentication) {
    ignoreChanges.push('administratorLogin');
    ignoreChanges.push('administratorLoginPassword');
  }

  const sqlServer = new sql.Server(
    sqlName,
    {
      serverName: sqlName,
      ...group,
      version: '12.0',
      minimalTlsVersion: '1.2',

      identity: { type: 'SystemAssigned' },
      administratorLogin: auth?.adminLogin,
      administratorLoginPassword: auth?.password,

      administrators: {
        administratorType: adminGroup
          ? sql.AdministratorType.ActiveDirectory
          : undefined,
        azureADOnlyAuthentication: Boolean(
          adminGroup && auth.azureAdOnlyAuthentication,
        ),

        principalType: sql.PrincipalType.Group,
        tenantId,
        sid: adminGroup?.objectId,
        login: adminGroup?.displayName,
      },
      publicNetworkAccess: network?.privateLink
        ? sql.ServerNetworkAccessFlag.Disabled
        : sql.ServerNetworkAccessFlag.Enabled,
    },
    {
      ignoreChanges,
    },
  );

  //Allows to Read Key Vault
  grantIdentityPermissions({
    name,
    vaultInfo,
    envRole: 'readOnly',
    principalId: sqlServer.identity.apply((s) => s!.principalId),
  });

  const ep = elasticPool
    ? createElasticPool({
        name,
        group,
        sqlName: sqlServer.name,
        sku: elasticPool,
      })
    : undefined;

  //Subnet
  if (network?.subnetId) {
    //Link to Vnet
    new sql.VirtualNetworkRule(sqlName, {
      virtualNetworkRuleName: `${sqlName}-vnetRule`,
      serverName: sqlServer.name,
      ...group,

      virtualNetworkSubnetId: network.subnetId,
      ignoreMissingVnetServiceEndpoint: false,
    });
  }
  //Private Link
  if (network?.privateLink) {
    privateEndpointCreator({
      resourceInfo: { name, group, id: sqlServer.id },
      privateDnsZoneName: 'privatelink.database.windows.net',
      subnetIds: network.privateLink.subnetIds,
      linkServiceGroupIds: network.privateLink.type
        ? [network.privateLink.type]
        : ['sqlServer'],
    });
  }

  //Allow Public Ip Accessing
  if (network?.acceptAllPublicConnect) {
    new sql.FirewallRule('accept-all-connection', {
      firewallRuleName: 'accept-all-connection',
      serverName: sqlServer.name,
      ...group,
      startIpAddress: '0.0.0.0',
      endIpAddress: '255.255.255.255',
    });
  } else if (network?.ipAddresses) {
    all(network.ipAddresses).apply((ips) =>
      convertToIpRange(ips).map((ip, i) => {
        const n = `${sqlName}-fwRule-${i}`;

        return new sql.FirewallRule(n, {
          firewallRuleName: n,
          serverName: sqlServer.name,
          ...group,
          startIpAddress: ip.start,
          endIpAddress: ip.end,
        });
      }),
    );
  }

  if (vulnerabilityAssessment) {
    //Grant Storage permission
    if (vulnerabilityAssessment.logStorageId) {
      roleAssignment({
        name,
        principalId: sqlServer.identity.apply((i) => i?.principalId || ''),
        principalType: 'ServicePrincipal',
        roleName: 'Storage Blob Data Contributor',
        scope: vulnerabilityAssessment.logStorageId,
      });
    }

    //ServerSecurityAlertPolicy
    const alertPolicy = new sql.ServerSecurityAlertPolicy(
      name,
      {
        securityAlertPolicyName: 'default',
        ...group,
        serverName: sqlServer.name,
        emailAccountAdmins: !vulnerabilityAssessment.alertEmails,
        emailAddresses: vulnerabilityAssessment.alertEmails,

        retentionDays: 7,

        storageAccountAccessKey: vulnerabilityAssessment.storageAccessKey,
        storageEndpoint: vulnerabilityAssessment.storageEndpoint,
        state: 'Enabled',
      },
      { dependsOn: sqlServer },
    );

    //Server Audit
    new sql.ExtendedServerBlobAuditingPolicy(
      name,
      {
        auditActionsAndGroups: [
          'SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP',
          'FAILED_DATABASE_AUTHENTICATION_GROUP',
          'BATCH_COMPLETED_GROUP',
        ],
        serverName: sqlServer.name,
        ...group,

        blobAuditingPolicyName: 'default',
        isAzureMonitorTargetEnabled: true,
        isStorageSecondaryKeyInUse: false,
        predicateExpression: "object_name = 'SensitiveData'",
        queueDelayMs: 4000,
        retentionDays: isPrd ? 30 : 6,
        state: 'Enabled',
        isDevopsAuditEnabled: true,

        storageAccountAccessKey: vulnerabilityAssessment.storageAccessKey,
        storageAccountSubscriptionId: subscriptionId,
        storageEndpoint: vulnerabilityAssessment.storageEndpoint,
      },
      { dependsOn: alertPolicy },
    );

    //ServerVulnerabilityAssessment
    new sql.ServerVulnerabilityAssessment(
      name,
      {
        vulnerabilityAssessmentName: name,
        ...group,
        serverName: sqlServer.name,

        recurringScans: {
          isEnabled: true,
          emailSubscriptionAdmins: !vulnerabilityAssessment.alertEmails,
          emails: vulnerabilityAssessment.alertEmails,
        },

        storageContainerPath: interpolate`${vulnerabilityAssessment.storageEndpoint}/${sqlName}`,
        storageAccountAccessKey: vulnerabilityAssessment.storageAccessKey,
      },
      { dependsOn: alertPolicy },
    );
  }

  if (encryptKey) {
    // Enable a server key in the SQL Server with reference to the Key Vault Key

    const serverKey = new sql.ServerKey(
      `${sqlName}-serverKey`,
      {
        resourceGroupName: group.resourceGroupName,
        serverName: sqlName,
        serverKeyType: 'AzureKeyVault',
        keyName: encryptKey.keyName,
        uri: encryptKey.url,
      },
      { dependsOn: sqlServer, ignoreChanges: ['keyName', 'uri'] },
    );

    new sql.EncryptionProtector(
      `${sqlName}-encryptionProtector`,
      {
        encryptionProtectorName: 'current',
        resourceGroupName: group.resourceGroupName,
        serverName: sqlName,
        serverKeyType: 'AzureKeyVault',
        serverKeyName: encryptKey.keyName,
        autoRotationEnabled: true,
      },
      { dependsOn: serverKey },
    );
  }

  const dbs: Record<string, ResourceInfoWithInstance<sql.Database>> = {};
  if (databases) {
    Object.keys(databases).forEach((key) => {
      const db = databases[key];
      const n = db.name ?? key;
      const d = sqlDbCreator({
        ...db,
        name: n,
        group,
        sqlServerName: sqlName,
        dependsOn: sqlServer,
        elasticPoolId: ep ? ep.id : undefined,
      });

      if (vaultInfo) {
        const connectionString = auth?.azureAdOnlyAuthentication
          ? interpolate`Data Source=${sqlName}.database.windows.net;Initial Catalog=${d.name};Authentication=Active Directory Integrated;;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=120;`
          : interpolate`Data Source=${sqlName}.database.windows.net;Initial Catalog=${d.name};User Id=${auth.adminLogin};Password=${auth.password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=120;`;

        addCustomSecret({
          name: d.name,
          value: connectionString,
          vaultInfo,
          contentType: `Sql ${d.name} Connection String`,
          dependsOn: d.instance,
        });
      }

      dbs[key] = d;
    });
  }

  // if (encryptKey) {
  //   //Enable TransparentDataEncryption for each database
  //   new sql.TransparentDataEncryption(`${sqlName}-${db.name}`, {
  //     serverName: sqlName,
  //     databaseName: d.name,
  //     resourceGroupName: group.resourceGroupName,
  //     state: "Enabled",
  //   });
  // }

  return {
    name: sqlName,
    group,
    id: sqlServer.id,
    resource: sqlServer,
    elasticPool: ep,
    databases: dbs,
  };
};
