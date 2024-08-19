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
import { enums } from '@pulumi/azure-native/types';

export type MySqlBuilderArgs = BuilderProps & WithEncryptionInfo;
type MySqlSkuArgs = {
  /**
   * The name of the sku, e.g. Standard_D32s_v3.
   */
  name: pulumi.Input<string>;
  /**
   * The tier of the particular SKU, e.g. GeneralPurpose.
   */
  tier: pulumi.Input<string | enums.dbformysql.SkuTier>;
};

export type MySqlSkuBuilderType = {
  sku: MySqlSkuArgs;
  version: dbformysql.ServerVersion;
};
export type MySqlNetworkBuilderType = NetworkPropsType & {
  allowsPublicAccess?: Input<boolean>;
};
export type MySqlOptionsBuilderType = {
  storageSizeGB?: Input<number>;
  maintenanceWindow?: {
    dayOfWeek: Input<number>;
    startHour: Input<number>;
    startMinute: Input<number>;
  };
};
export interface IMySqlSkuBuilder {
  withSku(props: MySqlSkuBuilderType): IMySqlLoginBuilder;
}

export interface IMySqlLoginBuilder {
  withLogin(props: LoginArgs): IMySqlBuilder;
  generateLogin(): IMySqlBuilder;
}

export interface IMySqlBuilder extends IBuilder<ResourceInfo> {
  withNetwork(props: MySqlNetworkBuilderType): IMySqlBuilder;
  withOptions(props: MySqlOptionsBuilderType): IMySqlBuilder;
  withDatabases(...props: string[]): IMySqlBuilder;
}
