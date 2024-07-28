import { Input } from '@pulumi/pulumi';
import {
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
import { LogStorageInfo } from '../../Logs/Helpers';

export type SqlBuilderAuthOptionsType = Omit<
  SqlAuthType,
  'password' | 'adminLogin' | 'envRoles'
>;
export type SqlDbBuilderType = { name: string; sku?: SqlDbSku };
export type SqlDbCopyType = SqlDbBuilderType & { copyFromDbId: Input<string> };
export type SqlDbReplicaType = SqlDbBuilderType & {
  replicaFromDbId: Input<string>;
};
export type FullSqlDbPropsType = Omit<
  SqlDbProps,
  | 'dependsOn'
  | 'importUri'
  | 'ignoreChanges'
  | 'group'
  | 'elasticPoolId'
  | 'sqlServerName'
>;

export type SqlBuilderVulnerabilityAssessmentType = {
  logInfo: LogStorageInfo;
} & Pick<SqlVulnerabilityAssessmentType, 'alertEmails'>;

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
  copyDbFrom(props: SqlDbCopyType): ISqlBuilder;
  replicaDbFrom(props: SqlDbReplicaType): ISqlBuilder;
  withVulnerabilityAssessment(
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder;
}
