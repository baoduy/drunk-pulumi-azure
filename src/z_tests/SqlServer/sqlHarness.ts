import SqlBuilder from '../../Builder/SqlBuilder';
import { ISqlBuilder, ISqlTierBuilder } from '../../Builder/types';
import { SqlElasticPoolType } from '../../Sql';
import { SqlDbSku } from '../../Sql/SqlDb';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

// Shared arrange/act steps for the legacy SQL backup and zone-redundancy
// acceptance tests (DRK-2570). Every helper builds its own SQL server through
// the public SqlBuilder, named after the test row, and looks resources up by
// name — Database and backup-policy registrations chain off Outputs and can
// land after the next test's watermark.
const DATABASE_TYPE = 'azure-native:sql:Database';
const ELASTIC_POOL_TYPE = 'azure-native:sql:ElasticPool';
const SHORT_TERM_POLICY_TYPE = 'azure-native:sql:BackupShortTermRetentionPolicy';

const group = { resourceGroupName: 'RG' };

const build = (
  name: string,
  tier: (builder: ISqlTierBuilder) => ISqlBuilder,
) => {
  const before = createdResources.length;
  const rs = tier(
    SqlBuilder({ name, group })
      .withLoginInfo({ adminLogin: 'sqladmin', password: 'P@ssw0rd123' })
      .withAuthOptions({})
      .withNetwork({}),
  ).build();
  return { before, rs };
};

const databaseInputs = (before: number, databaseName: string) =>
  waitForResource(DATABASE_TYPE, before, (i) => i.databaseName === databaseName);

/** A standalone database `name` on `sku`: its Database and short-term backup policy inputs. */
export const buildStandaloneDb = async (name: string, sku: SqlDbSku) => {
  const { before, rs } = build(name, (b) =>
    b.withTier(sku).withDatabases({ name }),
  );
  const databaseName = rs.databases![name].name;
  return {
    database: await databaseInputs(before, databaseName),
    shortTermPolicy: await waitForResource(
      SHORT_TERM_POLICY_TYPE,
      before,
      (i) => i.databaseName === databaseName,
    ),
  };
};

/** An elastic pool `pool` on a server named `name`, with no database: its ElasticPool inputs. */
export const buildElasticPool = (name: string, pool: SqlElasticPoolType) => {
  const { before, rs } = build(name, (b) => b.withElasticPool(pool));
  const poolName = rs.elasticPool!.name;
  return waitForResource(
    ELASTIC_POOL_TYPE,
    before,
    (i) => i.elasticPoolName === poolName,
  );
};

/** A database `name` inside the elastic pool `pool`; `sku` set on the database when given. */
export const buildPooledDb = async (
  name: string,
  pool: SqlElasticPoolType,
  sku?: SqlDbSku,
) => {
  const { before, rs } = build(name, (b) =>
    b.withElasticPool(pool).withDatabases({ name, sku }),
  );
  return databaseInputs(before, rs.databases![name].name);
};

/** A standalone database `name` on `sku`, copied from an existing database. */
export const buildCopiedDb = async (name: string, sku: SqlDbSku) => {
  const { before, rs } = build(name, (b) =>
    b.withTier(sku).copyDb({ name, fromDbId: '/subscriptions/1/databases/source' }),
  );
  return databaseInputs(before, rs.databases![name].name);
};

/** A standalone database `name` on `sku`, created as a geo-secondary of an existing database. */
export const buildReplicaDb = async (name: string, sku: SqlDbSku) => {
  const { before, rs } = build(name, (b) =>
    b.withTier(sku).replicaDb({ name, fromDbId: '/subscriptions/1/databases/source' }),
  );
  return databaseInputs(before, rs.databases![name].name);
};
