import Sql, { SqlElasticPoolType, SqlNetworkType, SqlResults } from '../Sql';
import { SqlDbSku } from '../Sql/SqlDb';
import { LoginArgs } from '../types';
import {
  Builder,
  FullSqlDbPropsType,
  ISqlAuthBuilder,
  ISqlBuilder,
  ISqlLoginBuilder,
  ISqlNetworkBuilder,
  ISqlTierBuilder,
  SqlBuilderArgs,
  SqlBuilderAuthOptionsType,
  SqlBuilderVulnerabilityAssessmentType,
  SqlDbBuilderType,
  SqlFromDbType,
} from './types';
import { randomLogin } from '../Core/Random';

class SqlBuilder
  extends Builder<SqlResults>
  implements
    ISqlLoginBuilder,
    ISqlAuthBuilder,
    ISqlNetworkBuilder,
    ISqlTierBuilder,
    ISqlBuilder
{
  //Instances
  private _sqlInstance: SqlResults | undefined = undefined;

  //Fields
  private _generateLogin: boolean = false;
  private _loginInfo: LoginArgs | undefined = undefined;
  private _authOptions: SqlBuilderAuthOptionsType = {};
  private _networkProps: SqlNetworkType | undefined = undefined;
  private _elasticPoolProps: SqlElasticPoolType | undefined = undefined;
  private _databasesProps: Record<string, FullSqlDbPropsType> = {};
  private _defaultSku: SqlDbSku = 'S0';
  private _vulnerabilityAssessment:
    | SqlBuilderVulnerabilityAssessmentType
    | undefined = undefined;
  private _ignoreChanges: string[] | undefined = undefined;
  private _lock: boolean = false;

  constructor(private args: SqlBuilderArgs) {
    super(args);
  }

  withVulnerabilityAssessmentIf(
    condition: boolean,
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder {
    if (condition) this.withVulnerabilityAssessment(props);
    return this;
  }
  withVulnerabilityAssessment(
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder {
    this._vulnerabilityAssessment = props;
    return this;
  }

  public withElasticPool(props: SqlElasticPoolType): ISqlBuilder {
    this._elasticPoolProps = props;
    return this;
  }
  public withTier(sku: SqlDbSku): ISqlBuilder {
    this._defaultSku = sku;
    return this;
  }
  public withDatabases(props: SqlDbBuilderType): ISqlBuilder {
    if (!props.sku) props.sku = this._defaultSku;
    this._databasesProps[props.name] = props;
    return this;
  }

  //Copy Db
  public copyDb(props: SqlFromDbType): ISqlBuilder {
    if (!props.sku) props.sku = this._defaultSku;
    this._databasesProps[props.name] = {
      ...props,
      copyFrom: props.fromDbId,
    };
    return this;
  }

  //ReplicateDb
  public replicaDb(props: SqlFromDbType): ISqlBuilder {
    if (!props.sku) props.sku = this._defaultSku;
    this._databasesProps[props.name] = {
      ...props,
      asSecondaryFrom: props.fromDbId,
    };
    return this;
  }
  public withNetwork(props: SqlNetworkType): ISqlTierBuilder {
    this._networkProps = props;
    return this;
  }
  public withAuthOptions(props: SqlBuilderAuthOptionsType): ISqlNetworkBuilder {
    this._authOptions = props;
    return this;
  }
  public generateLogin(): ISqlAuthBuilder {
    this._generateLogin = true;
    return this;
  }
  public withLoginInfo(props: LoginArgs): ISqlAuthBuilder {
    this._loginInfo = props;
    return this;
  }
  public ignoreChangesFrom(...props: string[]): ISqlBuilder {
    this._ignoreChanges = props;
    return this;
  }
  public lock(): ISqlBuilder {
    this._lock = true;
    return this;
  }
  private buildLogin() {
    if (!this._generateLogin) return;

    const login = randomLogin({
      name: this.commonProps.name,
      loginPrefix: this.commonProps.name,
      maxUserNameLength: 25,
      passwordOptions: {
        length: 50,
        policy: 'yearly',
        options: { lower: true, upper: true, special: false, numeric: true },
      },
      vaultInfo: this.commonProps.vaultInfo,
    });
    this._loginInfo = { adminLogin: login.userName, password: login.password };
  }

  private buildSql() {
    if (this._vulnerabilityAssessment && !this.args.logInfo)
      throw new Error(
        "The LogInfo's secrets are required to enable the vulnerability assessment.",
      );

    this._sqlInstance = Sql({
      ...this.commonProps,
      auth: {
        ...this._authOptions,
        ...this._loginInfo!,
        envRoles: this.args.envRoles,
      },
      vulnerabilityAssessment: this._vulnerabilityAssessment
        ? {
            ...this._vulnerabilityAssessment,
            logStorage: this.args.logInfo!.logStorage!,
          }
        : undefined,
      network: this._networkProps,
      elasticPool: this._elasticPoolProps,
      databases: this._databasesProps,
      lock: this._lock,
      ignoreChanges: this._ignoreChanges,
    });
  }

  public build() {
    this.buildLogin();
    this.buildSql();

    return this._sqlInstance!;
  }
}

export default (props: SqlBuilderArgs) =>
  new SqlBuilder(props) as ISqlLoginBuilder;
