import * as sql from '@pulumi/azure-native/sql';
import { all, Input, interpolate, Output } from '@pulumi/pulumi';
import { FullSqlDbPropsType } from '../Builder';
import { Locker } from '../Core/Locker';
import { addEncryptKey, addCustomSecret } from '../KeyVault';
import { naming, isPrd, subscriptionId, tenantId } from '../Common';
import {
  BasicEncryptResourceArgs,
  BasicResourceArgs,
  WithLockable,
  LogInfo,
  LoginWithEnvRolesArgs,
  NetworkPropsType,
  ResourceInfo,
  ResourceInfoWithInstance,
} from '../types';
import { convertToIpRange } from '../VNet/Helper';
import { SqlPrivateLink } from '../VNet';
import sqlDbCreator from './SqlDb';
import enableDbReadOnly from './EnableDbReadOnly';

type ElasticPoolCapacityProps = 50 | 100 | 200 | 300 | 400 | 800 | 1200;

interface ElasticPoolProps extends BasicResourceArgs {
  sqlName: Output<string>;
  /** Minimum is 50 Gd*/
  maxSizeBytesGb?: number;
  preferredEnclaveType?:
    | sql.v20230501preview.AlwaysEncryptedEnclaveType
    | string;
  sku?: { name: 'Standard' | 'Basic'; capacity: ElasticPoolCapacityProps };
}

const createElasticPool = ({
  group,
  name,
  sqlName,
  //Minimum is 50 GD
  maxSizeBytesGb,
  preferredEnclaveType = sql.v20230501preview.AlwaysEncryptedEnclaveType.VBS,
  sku = { name: isPrd ? 'Standard' : 'Basic', capacity: 50 },
  dependsOn,
}: ElasticPoolProps): ResourceInfoWithInstance<sql.ElasticPool> => {
  //Create Sql Elastic
  const elasticName = naming.getElasticPoolName(name);

  const ep = new sql.v20230501preview.ElasticPool(
    elasticName,
    {
      elasticPoolName: elasticName,
      serverName: sqlName,
      ...group,

      maxSizeBytes: maxSizeBytesGb
        ? maxSizeBytesGb * 1024 * 1024 * 1024
        : undefined,

      sku: {
        name: `${sku.name}Pool`,
        tier: sku.name,
        capacity: sku.capacity,
      },
      perDatabaseSettings: {
        minCapacity: 0,
        maxCapacity: sku.name === 'Basic' ? 5 : sku.capacity,
      },
      preferredEnclaveType,
      //licenseType: sql.ElasticPoolLicenseType.BasePrice,
      //zoneRedundant: isPrd,
    },
    { dependsOn },
  );

  return { name: elasticName, group, id: ep.id, instance: ep };
};

export type SqlAuthType = LoginWithEnvRolesArgs & {
  azureAdOnlyAuthentication?: boolean;
  defaultLoginManagedId?: Input<string>;
};

export type SqlNetworkType = NetworkPropsType & {
  //Enable this will add 0.0.0.0 to 255.255.255.255 to the DB whitelist
  acceptAllPublicConnect?: boolean;
};

export type SqlElasticPoolType = {
  name: 'Standard' | 'Basic';
  capacity: ElasticPoolCapacityProps;
  maxSizeBytesGb?: 50 | number;
};

export type SqlResults = ResourceInfo & {
  resource: sql.Server;
  elasticPool?: ResourceInfoWithInstance<sql.ElasticPool>;
  databases?: Record<string, ResourceInfoWithInstance<sql.Database>>;
};

export type SqlVulnerabilityAssessmentType = Pick<LogInfo, 'logStorage'> & {
  alertEmails: Array<string>;
  // logStorageId: Input<string>;
  // storageAccessKey: Input<string>;
  // storageEndpoint: Input<string>;
};

interface Props extends BasicEncryptResourceArgs, WithLockable {
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
  elasticPool,
  databases,
  vaultInfo,
  envUIDInfo,
  enableEncryption,
  envRoles,
  network,
  vulnerabilityAssessment,
  ignoreChanges = [],
  lock,
  dependsOn,
}: Props): SqlResults => {
  const sqlName = naming.getSqlServerName(name);
  const encryptKey = enableEncryption
    ? addEncryptKey(sqlName, vaultInfo!, 3072)
    : undefined;

  const adminGroup = auth.envRoles?.contributor;

  //ignoreChanges.push('keyId');
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

      identity: {
        type: envUIDInfo
          ? sql.IdentityType.SystemAssigned_UserAssigned
          : sql.IdentityType.SystemAssigned,
        userAssignedIdentities: envUIDInfo ? [envUIDInfo.id] : undefined,
      },
      primaryUserAssignedIdentityId: envUIDInfo ? envUIDInfo.id : undefined,
      administratorLogin: auth?.adminLogin,
      administratorLoginPassword: auth?.password,
      keyId: encryptKey?.url,

      administrators: {
        administratorType: adminGroup
          ? sql.AdministratorType.ActiveDirectory
          : undefined,
        azureADOnlyAuthentication: adminGroup
          ? (auth.azureAdOnlyAuthentication ?? true)
          : false,

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
      dependsOn,
      ignoreChanges,
      protect: lock,
    },
  );
  //Lock from delete
  if (lock) {
    Locker({ name: sqlName, resource: sqlServer });
  }
  //Allows to Read Key Vault
  envRoles?.addMember(
    'readOnly',
    sqlServer.identity.apply((s) => s!.principalId),
  );

  const ep = elasticPool
    ? createElasticPool({
        ...elasticPool,
        sku: elasticPool,
        name,
        group,
        sqlName: sqlServer.name,
        dependsOn: sqlServer,
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
    SqlPrivateLink({
      ...network.privateLink,
      resourceInfo: { name: sqlName, group, id: sqlServer.id },
      dependsOn: sqlServer,
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

  if (vulnerabilityAssessment?.logStorage) {
    //Grant Storage permission
    envRoles?.addMember(
      'contributor',
      sqlServer.identity.apply((i) => i!.principalId!),
    );

    //ServerSecurityAlertPolicy
    const alertPolicy = new sql.ServerSecurityAlertPolicy(
      sqlName,
      {
        securityAlertPolicyName: 'default',
        ...group,
        serverName: sqlServer.name,
        emailAccountAdmins: !vulnerabilityAssessment.alertEmails,
        emailAddresses: vulnerabilityAssessment.alertEmails,

        retentionDays: 7,

        storageAccountAccessKey: vulnerabilityAssessment.logStorage.primaryKey,
        storageEndpoint: vulnerabilityAssessment.logStorage.endpoints.blob,
        state: 'Enabled',
      },
      { dependsOn: sqlServer },
    );

    //Server Audit
    new sql.ExtendedServerBlobAuditingPolicy(
      sqlName,
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

        storageAccountAccessKey: vulnerabilityAssessment.logStorage.primaryKey,
        storageAccountSubscriptionId: subscriptionId,
        storageEndpoint: vulnerabilityAssessment.logStorage.endpoints.blob,
      },
      { dependsOn: alertPolicy },
    );

    //ServerVulnerabilityAssessment
    new sql.ServerVulnerabilityAssessment(
      sqlName,
      {
        vulnerabilityAssessmentName: sqlName,
        ...group,
        serverName: sqlServer.name,

        recurringScans: {
          isEnabled: true,
          emailSubscriptionAdmins: !vulnerabilityAssessment.alertEmails,
          emails: vulnerabilityAssessment.alertEmails,
        },

        storageContainerPath: interpolate`${vulnerabilityAssessment.logStorage.endpoints.blob}/${sqlName}`,
        storageAccountAccessKey: vulnerabilityAssessment.logStorage.primaryKey,
      },
      { dependsOn: alertPolicy },
    );
  }

  if (encryptKey) {
    // Enable a server key in the SQL Server with reference to the Key Vault Key
    const keyName = interpolate`${vaultInfo!.name}_${encryptKey.keyName}_${encryptKey.keyVersion}`;
    //Server key maybe auto created by Azure
    // const serverKey = new sql.ServerKey(
    //   `${sqlName}-serverKey`,
    //   {
    //     resourceGroupName: group.resourceGroupName,
    //     serverName: sqlName,
    //     serverKeyType: sql.ServerKeyType.AzureKeyVault,
    //     keyName,
    //     uri: encryptKey.url,
    //   },
    //   { dependsOn: sqlServer, retainOnDelete: true },
    // );

    //enable the EncryptionProtector
    new sql.EncryptionProtector(
      `${sqlName}-encryptionProtector`,
      {
        encryptionProtectorName: 'current',
        resourceGroupName: group.resourceGroupName,
        serverName: sqlName,
        serverKeyType: sql.ServerKeyType.AzureKeyVault,
        serverKeyName: keyName, //serverKey.name,
        autoRotationEnabled: true,
      },
      { dependsOn: sqlServer },
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
        dependsOn: ep?.instance ? [ep.instance, sqlServer] : sqlServer,
        elasticPoolId: ep?.id,
      });

      if (vaultInfo) {
        //Refer here to build connection correctly: https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver16
        const connectionString = auth?.azureAdOnlyAuthentication
          ? auth?.defaultLoginManagedId
            ? interpolate`Server=tcp:${sqlName}.database.windows.net,1433; Initial Catalog=${d.name}; Authentication="Active Directory Managed Identity"; User Id=${auth.defaultLoginManagedId}; MultipleActiveResultSets=False; Encrypt=True; TrustServerCertificate=True; Connection Timeout=120;`
            : interpolate`Server=tcp:${sqlName}.database.windows.net,1433; Initial Catalog=${d.name}; Authentication="Active Directory Default"; MultipleActiveResultSets=False;Encrypt=True; TrustServerCertificate=True; Connection Timeout=120;`
          : interpolate`Server=tcp:${sqlName}.database.windows.net,1433; Initial Catalog=${d.name}; User Id=${auth.adminLogin}; Password=${auth.password}; MultipleActiveResultSets=False; Encrypt=True; TrustServerCertificate=True; Connection Timeout=120;`;

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

  //Create ReadOnly Roles for All Db
  if (envRoles?.readOnly) {
    enableDbReadOnly({
      dependsOn: sqlServer,
      sqlServer: { name: sqlName, group, id: sqlServer.id },
      entraGroup: envRoles.readOnly,
    });
  }

  return {
    name: sqlName,
    group,
    id: sqlServer.id,
    resource: sqlServer,
    elasticPool: ep,
    databases: dbs,
  };
};
