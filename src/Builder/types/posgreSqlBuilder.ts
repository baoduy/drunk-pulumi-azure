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

export type PostgreSqlBuilderArgs = BuilderProps & WithEncryptionInfo;

type PostgreSkuArgs = {
  /**
   * The name of the sku, typically, tier + family + cores, e.g. Standard_D4s_v3.
   */
  name: pulumi.Input<string>;
  /**
   * The tier of the particular SKU, e.g. Burstable.
   */
  tier: pulumi.Input<string | enums.dbforpostgresql.SkuTier>;
};

export type PostgreSqlSkuBuilderType = {
  sku: PostgreSkuArgs;
  version: postgresql.ServerVersion;
};
export type PostgreSqlNetworkBuilderType = NetworkPropsType & {
  allowsPublicAccess?: Input<boolean>;
};
export type PostgreSqlOptionsBuilderType = {
  storageSizeGB?: Input<number>;
  maintenanceWindow?: {
    dayOfWeek: Input<number>;
    startHour: Input<number>;
    startMinute: Input<number>;
  };
};
export interface IPostgreSqlSkuBuilder {
  withSku(props: PostgreSqlSkuBuilderType): IPostgreSqlLoginBuilder;
}

export interface IPostgreSqlLoginBuilder {
  withLogin(props: LoginArgs): IPostgreSqlBuilder;
  generateLogin(): IPostgreSqlBuilder;
}

export interface IPostgreSqlBuilder extends IBuilder<ResourceInfo> {
  withNetwork(props: PostgreSqlNetworkBuilderType): IPostgreSqlBuilder;
  withOptions(props: PostgreSqlOptionsBuilderType): IPostgreSqlBuilder;
  withDatabases(...props: string[]): IPostgreSqlBuilder;
}
