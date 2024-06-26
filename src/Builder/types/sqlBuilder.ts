import { IBuilder, ILoginBuilder } from "./genericBuilder";
import {
  SqlAuthType,
  SqlElasticPoolType,
  SqlNetworkType,
  SqlResults,
  SqlVulnerabilityAssessmentType,
} from "../../Sql";
import { SqlDbSku } from "../../Sql/SqlDb";
import { LogInfoResults, LogStorageInfo } from "../../Logs/Helpers";

export type SqlBuilderAuthOptionsType = Pick<
  SqlAuthType,
  "azureAdOnlyAuthentication"
>;

export type SqlDbBuilderType = Record<
  string,
  { name?: string; sku?: SqlDbSku }
>;
export type SqlBuilderVulnerabilityAssessmentType = {
  logInfo: LogStorageInfo;
} & Pick<SqlVulnerabilityAssessmentType, "alertEmails">;

export interface ISqlLoginBuilder extends ILoginBuilder<ISqlAuthBuilder> {}

export interface ISqlAuthBuilder {
  withAuthOptions(props: SqlBuilderAuthOptionsType): ISqlNetworkBuilder;
}
export interface ISqlNetworkBuilder {
  withNetwork(props: SqlNetworkType): ISqlBuilder;
}

export interface ISqlBuilder extends IBuilder<SqlResults> {
  withElasticPool(props: SqlElasticPoolType): ISqlBuilder;
  withDatabases(props: SqlDbBuilderType): ISqlBuilder;
  withVulnerabilityAssessment(
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder;
}
