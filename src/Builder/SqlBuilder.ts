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

/**
 * SqlBuilder class for creating and configuring Azure SQL Database resources.
 * This class implements the Builder pattern for SQL Server and Database configuration including
 * authentication, networking, elastic pools, databases, and security assessments.
 * @extends Builder<SqlResults>
 * @implements ISqlLoginBuilder
 * @implements ISqlAuthBuilder
 * @implements ISqlNetworkBuilder
 * @implements ISqlTierBuilder
 * @implements ISqlBuilder
 */
class SqlBuilder
  extends Builder<SqlResults>
  implements
    ISqlLoginBuilder,
    ISqlAuthBuilder,
    ISqlNetworkBuilder,
    ISqlTierBuilder,
    ISqlBuilder
{
  // Resource instances
  private _sqlInstance: SqlResults | undefined = undefined;

  // Configuration properties
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

  /**
   * Creates an instance of SqlBuilder.
   * @param {SqlBuilderArgs} args - The arguments for building the SQL Server and databases.
   */
  constructor(private args: SqlBuilderArgs) {
    super(args);
  }

  /**
   * Conditionally configures vulnerability assessment for the SQL Server.
   * @param {boolean} condition - Whether to apply the vulnerability assessment.
   * @param {SqlBuilderVulnerabilityAssessmentType} props - The vulnerability assessment configuration.
   * @returns {ISqlBuilder} The current SqlBuilder instance.
   */
  withVulnerabilityAssessmentIf(
    condition: boolean,
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder {
    if (condition) this.withVulnerabilityAssessment(props);
    return this;
  }

  /**
   * Configures vulnerability assessment for the SQL Server.
   * @param {SqlBuilderVulnerabilityAssessmentType} props - The vulnerability assessment configuration.
   * @returns {ISqlBuilder} The current SqlBuilder instance.
   */
  withVulnerabilityAssessment(
    props: SqlBuilderVulnerabilityAssessmentType,
  ): ISqlBuilder {
    this._vulnerabilityAssessment = props;
    return this;
  }

  /**
   * Configures an elastic pool for the SQL Server.
   * @param {SqlElasticPoolType} props - The elastic pool configuration.
   * @returns {ISqlBuilder} The current SqlBuilder instance.
   */
  public withElasticPool(props: SqlElasticPoolType): ISqlBuilder {
    this._elasticPoolProps = props;
    return this;
  }

  /**
   * Conditionally configures an elastic pool for the SQL Server.
   * @param {boolean} condition - Whether to apply the elastic pool configuration.
   * @param {SqlElasticPoolType} props - The elastic pool configuration.
   * @returns {ISqlBuilder} The current SqlBuilder instance.
   */
  public withElasticPoolIf(
    condition: boolean,
    props: SqlElasticPoolType,
  ): ISqlBuilder {
    if (condition) this.withElasticPool(props);
    return this;
  }

  /**
   * Sets the default SKU tier for databases.
   * @param {SqlDbSku} sku - The default SKU for databases (e.g., 'S0', 'S1', 'P1').
   * @returns {ISqlBuilder} The current SqlBuilder instance.
   */
  public withTier(sku: SqlDbSku): ISqlBuilder {
    this._defaultSku = sku;
    return this;
  }

  /**
   * Adds a database to the SQL Server.
   * @param {SqlDbBuilderType} props - The database configuration including name and optional SKU.
   * @returns {ISqlBuilder} The current SqlBuilder instance.
   */
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
  public withNetworkIf(
    condition: boolean,
    props: SqlNetworkType,
  ): ISqlTierBuilder {
    if (condition) this.withNetwork(props);
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
  public lock(lock: boolean = true): ISqlBuilder {
    this.args.lock = lock;
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
      ...this.args,
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
      ignoreChanges: this._ignoreChanges,
    });
  }

  // private buildReadOnlyRoles() {
  //   const { envRoles } = this.args;
  //   if (!envRoles?.readOnly) return;
  //
  //   //Create ReadOnly Roles for All Db
  //   console.log('Creating ReadOnly roles for:', this._sqlInstance!.name);
  //   enableDbReadOnly({
  //     dependsOn: this._sqlInstance!.resource,
  //     sqlServer: this._sqlInstance!,
  //     group: envRoles!.readOnly,
  //     login: this._loginInfo,
  //   });
  // }

  public build() {
    this.buildLogin();
    this.buildSql();
    //this.buildReadOnlyRoles();

    return this._sqlInstance!;
  }
}

export default (props: SqlBuilderArgs) =>
  new SqlBuilder(props) as ISqlLoginBuilder;
