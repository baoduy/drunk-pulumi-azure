import { BuilderProps, IBuilder } from './genericBuilder';
import {
  LoginArgs,
  NetworkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import * as pulumi from '@pulumi/pulumi';
import * as dbformysql from '@pulumi/azure-native/dbformysql';
import { Input } from '@pulumi/pulumi';

/**
 * Arguments for the MySQL Builder.
 */
export type MySqlBuilderArgs = BuilderProps & WithEncryptionInfo;

/**
 * Properties for configuring the SKU of a MySQL server.
 */
type MySqlSkuArgs = {
  /**
   * The name of the SKU, e.g. Standard_D32s_v3.
   */
  name: pulumi.Input<string>;
  /**
   * The tier of the particular SKU, e.g. GeneralPurpose.
   */
  tier: pulumi.Input<string>;
};

/**
 * Properties for configuring the MySQL SKU and version.
 */
export type MySqlSkuBuilderType = {
  sku: MySqlSkuArgs;
  version: dbformysql.ServerVersion;
};

/**
 * Properties for configuring the network settings of a MySQL server.
 */
export type MySqlNetworkBuilderType = NetworkPropsType & {
  allowsPublicAccess?: Input<boolean>;
};

/**
 * Properties for configuring additional options of a MySQL server.
 */
export type MySqlOptionsBuilderType = {
  storageSizeGB?: Input<number>;
  maintenanceWindow?: {
    dayOfWeek: Input<number>;
    startHour: Input<number>;
    startMinute: Input<number>;
  };
};

/**
 * Interface for building the SKU of a MySQL server.
 */
export interface IMySqlSkuBuilder {
  /**
   * Method to set the SKU for the MySQL server.
   * @param props - Properties for the MySQL SKU and version.
   * @returns An instance of IMySqlLoginBuilder.
   */
  withSku(props: MySqlSkuBuilderType): IMySqlLoginBuilder;
}

/**
 * Interface for building login credentials for a MySQL server.
 */
export interface IMySqlLoginBuilder {
  /**
   * Method to set login credentials for the MySQL server.
   * @param props - Properties for the login credentials.
   * @returns An instance of IMySqlBuilder.
   */
  withLogin(props: LoginArgs): IMySqlBuilder;

  /**
   * Method to generate login credentials for the MySQL server.
   * @returns An instance of IMySqlBuilder.
   */
  generateLogin(): IMySqlBuilder;
}

/**
 * Interface for building a MySQL server.
 */
export interface IMySqlBuilder extends IBuilder<ResourceInfo> {
  /**
   * Method to set network properties for the MySQL server.
   * @param props - Properties for the network configuration.
   * @returns An instance of IMySqlBuilder.
   */
  withNetwork(props: MySqlNetworkBuilderType): IMySqlBuilder;

  /**
   * Method to set additional options for the MySQL server.
   * @param props - Properties for the additional options.
   * @returns An instance of IMySqlBuilder.
   */
  withOptions(props: MySqlOptionsBuilderType): IMySqlBuilder;

  /**
   * Method to add databases to the MySQL server.
   * @param props - Names of the databases to add.
   * @returns An instance of IMySqlBuilder.
   */
  withDatabases(...props: string[]): IMySqlBuilder;
}
