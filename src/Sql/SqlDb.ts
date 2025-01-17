import * as sql from '@pulumi/azure-native/sql';
import { Locker } from '../Core/Locker';
import {
  BasicResourceArgs,
  WithLockable,
  ResourceInfoWithInstance,
} from '../types';
import { Input, Output } from '@pulumi/pulumi';
import { naming, isPrd } from '../Common';

export type SqlDbSku =
  | 'Basic'
  | 'S0'
  | 'S1'
  | 'S2'
  | 'S3'
  | 'P1'
  | 'P2'
  | 'P4'
  | 'P6'
  | 'P11';

export interface SqlDbProps extends BasicResourceArgs, WithLockable {
  sqlServerName: Input<string>;
  elasticPoolId?: Output<string>;
  /** Provide this if elasticPoolId is not provided. Default is S0 */
  copyFrom?: Input<string>;
  asSecondaryFrom?: Input<string>;
  sku?: SqlDbSku;
}

//https://blog.bredvid.no/handling-azure-managed-identity-access-to-azure-sql-in-an-azure-devops-pipeline-1e74e1beb10b
export default ({
  group,
  name,
  sqlServerName,
  elasticPoolId,
  copyFrom,
  asSecondaryFrom,
  sku = 'S0',
  dependsOn,
  importUri,
  ignoreChanges,
  lock,
}: SqlDbProps): ResourceInfoWithInstance<sql.Database> => {
  name = naming.getSqlDbName(name);

  const dbProps: sql.DatabaseArgs = {
    databaseName: name,
    ...group,
    serverName: sqlServerName,
    elasticPoolId,
    sku: elasticPoolId
      ? undefined
      : {
          name: sku,
        },
    requestedBackupStorageRedundancy: isPrd ? 'Zone' : 'Local',
    createMode: sql.CreateMode.Default,
  };

  if (copyFrom) {
    dbProps.sourceDatabaseId = copyFrom;
    dbProps.createMode = sql.CreateMode.Copy;
  } else if (asSecondaryFrom) {
    dbProps.sourceDatabaseId = asSecondaryFrom;
    dbProps.createMode = sql.CreateMode.Secondary;
    dbProps.secondaryType = sql.SecondaryType.Geo;
  }

  const sqlDb = new sql.Database(name, dbProps, {
    dependsOn,
    ignoreChanges,
    import: importUri,
    retainOnDelete: true,
    protect: lock,
  });

  //Lock from delete
  if (lock) {
    Locker({ name, resource: sqlDb });
  }

  new sql.BackupShortTermRetentionPolicy(`${name}-short-term`, {
    ...group,
    databaseName: sqlDb.name,
    serverName: sqlServerName,
    policyName: 'default',
    diffBackupIntervalInHours: isPrd ? 12 : 24,
    retentionDays: 7,
  });

  if (isPrd) {
    new sql.BackupLongTermRetentionPolicy(`${name}-long-term`, {
      ...group,
      databaseName: sqlDb.name,
      serverName: sqlServerName,
      policyName: 'default',
      weekOfYear: 5,
      monthlyRetention: 'P1Y',
      weeklyRetention: 'P1M',
      yearlyRetention: 'P3Y',
    });
  }

  return { name, group, id: sqlDb.id, instance: sqlDb };
};
