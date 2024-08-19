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

/**
 * Arguments required for building a SQL resource.
 */
export type SqlBuilderArgs = BuilderProps &
  WithEnvRoles &
  WithLogInfo &
  WithLockable;

/**
 * Options for SQL authentication, excluding sensitive fields.
 */
export type SqlBuilderAuthOptionsType = Omit<
  SqlAuthType,
  'password' | 'adminLogin' | 'envRoles'
>;

/**
 * Arguments for defining a SQL database.
 */
export type SqlDbBuilderType = { 
  /**
   * The name of the database.
   */
  name: string; 
  /**
   * The SKU of the database.
   */
  sku?: SqlDbSku 
};

/**
 * Arguments for defining a SQL database from an existing database ID.
 */
export type SqlFromDbType = SqlDbBuilderType & { 
  /**
   * The ID of the existing database.
   */
  fromDbId: Input<string> 
};

/**
 * Full properties for a SQL database, excluding certain fields.
 */
export type FullSqlDbPropsType = Omit<
  SqlDbProps,
  | 'dependsOn'
  | 'importUri'
  | 'ignoreChanges'
  | 'group'
  | 'elasticPoolId'
  | 'sqlServerName'
>;

/**
 * Vulnerability assessment properties for a SQL database.
 */
export type SqlBuilderVulnerabilityAssessmentType = Pick<
  SqlVulnerabilityAssessmentType,
  'alertEmails'
>;

/**
 * Interface for building SQL login credentials.
 */
export interface ISqlLoginBuilder extends ILoginBuilder<ISqlAuthBuilder> {}

/**
 * Interface for building SQL authentication options.
 */
export interface ISqlAuthBuilder {
  /**
   * Sets the authentication options for the SQL server.
   * @param props - The authentication options.
   * @returns An instance of ISqlNetworkBuilder.
   */
  withAuthOptions(props: SqlBuilderAuthOptionsType): ISqlNetworkBuilder;
}

/**
 * Interface for building SQL network properties.
 */
export interface ISqlNetworkBuilder {
  /**
   * Sets the network properties for the SQL server.
   * @param props - The network properties.
   * @returns An instance of ISqlTierBuilder.
   */
  withNetwork(props: SqlNetworkType): ISqlTierBuilder;
}

/**
 * Interface for building SQL tier and elastic pool properties.
 */
export interface ISqlTierBuilder {
  /**
   * Sets the elastic pool properties for the SQL server.
   * @param props - The elastic pool properties.
   * @returns An instance of ISqlBuilder.
   */
  withElasticPool(props: SqlElasticPoolType): ISqlBuilder;
  
  /**
   * Sets the tier properties for the SQL server.
   * @param sku - The SKU of the database.
   * @returns An instance of ISqlBuilder.
   */
  withTier(sku: SqlDbSku): ISqlBuilder;
}

/**
 * Interface for building a SQL server.
 */
export interface ISqlBuilder
  extends IBuilder<SqlResults>,
    ILockable<ISqlBuilder>,
    IIgnoreChanges<ISqlBuilder> {
  /**
   * Adds databases to the SQL server.
   * @param props - The properties of the databases.
   * @returns An instance of ISqlBuilder.
   */
  withDatabases(props: SqlDbBuilderType): ISqlBuilder;
  
  /**
   * Copies an existing database to the SQL server.
   * @param props - The properties of the database to copy.
   * @returns An instance of ISqlBuilder.
   */
  copyDb(props: SqlFromDbType): ISqlBuilder;
  
  /**
   * Creates a replica of an existing database on the SQL server.
   * @param props - The properties of the database to replicate.
   * @returns An instance of ISqlBuilder.
   */
  replicaDb(props: SqlFromDbType): ISqlBuilder;
  
  /**
   * Sets the vulnerability assessment properties for the SQL server.
   * @param props - The vulnerability assessment properties.
   * @returns An instance of ISqlBuilder.
   */
  withVulnerabilityAssessment(
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder;
  
  /**
   * Conditionally sets the vulnerability assessment properties for the SQL server.
   * @param condition - The condition to check.
   * @param props - The vulnerability assessment properties.
   * @returns An instance of ISqlBuilder.
   */
  withVulnerabilityAssessmentIf(
    condition: boolean,
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder;
}