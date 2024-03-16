import * as sql from '@pulumi/azure-native/sql';

import { BasicResourceArgs, BasicResourceResultProps } from '../types';
import { Input, Output, Resource } from '@pulumi/pulumi';

import { defaultTags, isPrd } from '../Common/AzureEnv';
import { getSqlDbName } from '../Common/Naming';
import Locker from '../Core/Locker';

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

export interface SqlDbProps extends BasicResourceArgs {
  sqlServerName: Input<string>;
  elasticPoolId?: Output<string>;
  /**Provide this if elasticPoolId is not provided. Default is S0*/
  sku?: SqlDbSku;
  lock?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

//https://blog.bredvid.no/handling-azure-managed-identity-access-to-azure-sql-in-an-azure-devops-pipeline-1e74e1beb10b
export default ({
  group,
  name,
  sqlServerName,
  elasticPoolId,
  sku = 'S0',
  lock,
  dependsOn,
}: SqlDbProps): BasicResourceResultProps<sql.Database> => {
  name = getSqlDbName(name);

  const sqlDb = new sql.Database(
    name,
    {
      databaseName: name,
      createMode: 'Default',
      ...group,
      serverName: sqlServerName,
      elasticPoolId,

      sku: elasticPoolId
        ? undefined
        : {
            name: sku,
            // tier: 'Basic',
            // capacity: 5,
          },
      //zoneRedundant: isPrd,
      requestedBackupStorageRedundancy: isPrd ? 'Zone' : 'Local',

      tags: defaultTags,
    },
    { dependsOn }
  );

  if (lock) {
    Locker({ name, resourceId: sqlDb.id, dependsOn: sqlDb });
  }

  //By Default is 7 Day
  if (isPrd) {
    new sql.BackupShortTermRetentionPolicy(name, {
      policyName: 'default',
      serverName: sqlServerName,
      ...group,
      databaseName: sqlDb.name,
      retentionDays: 7,
    });
  }

  return { name, resource: sqlDb };
};
