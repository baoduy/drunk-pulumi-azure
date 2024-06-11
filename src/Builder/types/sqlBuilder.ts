import { IBuilder } from "./genericBuilder";
import {
  SqlAuthType,
  SqlElasticPoolType,
  SqlNetworkType,
  SqlResults,
} from "../../Sql";
import { SqlDbSku } from "../../Sql/SqlDb";

export type SqlBuilderAuthOptionsType = Pick<
  SqlAuthType,
  "enableAdAdministrator" | "azureAdOnlyAuthentication"
>;

export type SqlBuilderLoginInfoType = Pick<
  SqlAuthType,
  "adminLogin" | "password"
>;

export type SqlDbBuilderType = Record<
  string,
  { name?: string; sku?: SqlDbSku }
>;

export interface ISqlLoginBuilder {
  generateLogin: () => ISqlAuthBuilder;
  withLoginInfo: (props: SqlBuilderLoginInfoType) => ISqlAuthBuilder;
}

export interface ISqlAuthBuilder {
  withAuthOptions: (props: SqlBuilderAuthOptionsType) => ISqlNetworkBuilder;
}
export interface ISqlNetworkBuilder {
  withNetwork: (props: SqlNetworkType) => ISqlBuilder;
}

export interface ISqlBuilder extends IBuilder<SqlResults> {
  withElasticPool: (props: SqlElasticPoolType) => ISqlBuilder;
  withDatabases: (props: SqlDbBuilderType) => ISqlBuilder;
}
