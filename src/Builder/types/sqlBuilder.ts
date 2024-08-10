import { Input } from '@pulumi/pulumi';
import {
  BuilderProps,
  IBuilder,
  IIgnoreChanges,
  ILockable,
  ILoginBuilder,
} from './genericBuilder';
import {
  SqlAuthType,
  SqlElasticPoolType,
  SqlNetworkType,
  SqlResults,
  SqlVulnerabilityAssessmentType,
} from '../../Sql';
import { SqlDbProps, SqlDbSku } from '../../Sql/SqlDb';
import { WithEnvRoles, WithLockable, WithLogInfo } from '../../types';

export type SqlBuilderArgs = BuilderProps &
  WithEnvRoles &
  WithLogInfo &
  WithLockable;
export type SqlBuilderAuthOptionsType = Omit<
  SqlAuthType,
  'password' | 'adminLogin' | 'envRoles'
>;
export type SqlDbBuilderType = { name: string; sku?: SqlDbSku };
export type SqlFromDbType = SqlDbBuilderType & { fromDbId: Input<string> };

export type FullSqlDbPropsType = Omit<
  SqlDbProps,
  | 'dependsOn'
  | 'importUri'
  | 'ignoreChanges'
  | 'group'
  | 'elasticPoolId'
  | 'sqlServerName'
>;

export type SqlBuilderVulnerabilityAssessmentType = Pick<
  SqlVulnerabilityAssessmentType,
  'alertEmails'
>;

export interface ISqlLoginBuilder extends ILoginBuilder<ISqlAuthBuilder> {}

export interface ISqlAuthBuilder {
  withAuthOptions(props: SqlBuilderAuthOptionsType): ISqlNetworkBuilder;
}
export interface ISqlNetworkBuilder {
  withNetwork(props: SqlNetworkType): ISqlTierBuilder;
}
export interface ISqlTierBuilder {
  withElasticPool(props: SqlElasticPoolType): ISqlBuilder;
  withTier(sku: SqlDbSku): ISqlBuilder;
}
export interface ISqlBuilder
  extends IBuilder<SqlResults>,
    ILockable<ISqlBuilder>,
    IIgnoreChanges<ISqlBuilder> {
  withDatabases(props: SqlDbBuilderType): ISqlBuilder;
  copyDb(props: SqlFromDbType): ISqlBuilder;
  replicaDb(props: SqlFromDbType): ISqlBuilder;
  withVulnerabilityAssessment(
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder;
  /** Allows to on/off the Assessment based on environment condition */
  withVulnerabilityAssessmentIf(
    condition: boolean,
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder;
}
