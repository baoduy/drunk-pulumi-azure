import { BuilderProps, IBuilder } from './genericBuilder';
import {
  LoginArgs,
  NetworkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import * as pulumi from '@pulumi/pulumi';
import * as postgresql from '@pulumi/azure-native/dbforpostgresql';
import { Input } from '@pulumi/pulumi';
import { enums } from '@pulumi/azure-native/types';

/**
 * Arguments required for building a PostgreSQL resource.
 */
export type PostgreSqlBuilderArgs = BuilderProps & WithEncryptionInfo;

/**
 * Arguments for defining the SKU of a PostgreSQL server.
 */
type PostgreSkuArgs = {
  /**
   * The name of the SKU, typically tier + family + cores, e.g., Standard_D4s_v3.
   */
  name: pulumi.Input<string>;
  /**
   * The tier of the particular SKU, e.g., Burstable.
   */
  tier: pulumi.Input<string | enums.dbforpostgresql.SkuTier>;
};

/**
 * Type for defining the SKU and version of a PostgreSQL server.
 */
export type PostgreSqlSkuBuilderType = {
  sku: PostgreSkuArgs;
  version: postgresql.PostgresMajorVersion;
};

/**
 * Type for defining network properties for a PostgreSQL server.
 */
export type PostgreSqlNetworkBuilderType = NetworkPropsType & {
  /**
   * Whether the server allows public access.
   */
  allowsPublicAccess?: Input<boolean>;
};

/**
 * Type for defining additional options for a PostgreSQL server.
 */
export type PostgreSqlOptionsBuilderType = {
  /**
   * The storage size in GB.
   */
  storageSizeGB?: Input<number>;
  /**
   * Maintenance window settings.
   */
  maintenanceWindow?: {
    dayOfWeek: Input<number>;
    startHour: Input<number>;
    startMinute: Input<number>;
  };
};

/**
 * Interface for building the SKU of a PostgreSQL server.
 */
export interface IPostgreSqlSkuBuilder {
  /**
   * Sets the SKU properties for the PostgreSQL server.
   * @param props - The SKU properties.
   * @returns An instance of IPostgreSqlLoginBuilder.
   */
  withSku(props: PostgreSqlSkuBuilderType): IPostgreSqlLoginBuilder;
}

/**
 * Interface for building the login credentials of a PostgreSQL server.
 */
export interface IPostgreSqlLoginBuilder {
  /**
   * Sets the login credentials for the PostgreSQL server.
   * @param props - The login arguments.
   * @returns An instance of IPostgreSqlBuilder.
   */
  withLogin(props: LoginArgs): IPostgreSqlBuilder;
  
  /**
   * Generates login credentials for the PostgreSQL server.
   * @returns An instance of IPostgreSqlBuilder.
   */
  generateLogin(): IPostgreSqlBuilder;
}

/**
 * Interface for building a PostgreSQL server.
 */
export interface IPostgreSqlBuilder extends IBuilder<ResourceInfo> {
  /**
   * Sets the network properties for the PostgreSQL server.
   * @param props - The network properties.
   * @returns An instance of IPostgreSqlBuilder.
   */
  withNetwork(props: PostgreSqlNetworkBuilderType): IPostgreSqlBuilder;
  
  /**
   * Sets additional options for the PostgreSQL server.
   * @param props - The options properties.
   * @returns An instance of IPostgreSqlBuilder.
   */
  withOptions(props: PostgreSqlOptionsBuilderType): IPostgreSqlBuilder;
  
  /**
   * Adds databases to the PostgreSQL server.
   * @param props - The names of the databases.
   * @returns An instance of IPostgreSqlBuilder.
   */
  withDatabases(...props: string[]): IPostgreSqlBuilder;
}