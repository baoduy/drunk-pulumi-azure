import Sql, {
  SqlElasticPoolType,
  SqlNetworkType,
  SqlResults,
  SqlVulnerabilityAssessmentType,
} from "../Sql";
import {
  Builder,
  BuilderProps,
  ISqlAuthBuilder,
  ISqlBuilder,
  ISqlLoginBuilder,
  ISqlNetworkBuilder,
  LoginBuilderProps,
  SqlBuilderAuthOptionsType,
  SqlBuilderVulnerabilityAssessmentType,
  SqlDbBuilderType,
} from "./types";
import { randomLogin } from "../Core/Random";

class SqlBuilder
  extends Builder<SqlResults>
  implements ISqlLoginBuilder, ISqlAuthBuilder, ISqlNetworkBuilder, ISqlBuilder
{
  private _generateLogin: boolean = false;
  private _loginInfo: LoginBuilderProps | undefined = undefined;
  private _authOptions: SqlBuilderAuthOptionsType = {};
  private _networkProps: SqlNetworkType | undefined = undefined;
  private _elasticPoolProps: SqlElasticPoolType | undefined = undefined;
  private _databasesProps: SqlDbBuilderType = {};
  private _vulnerabilityAssessment:
    | SqlBuilderVulnerabilityAssessmentType
    | undefined = undefined;

  private _sqlInstance: SqlResults | undefined = undefined;

  constructor(props: BuilderProps) {
    super(props);
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
  public withDatabases(props: SqlDbBuilderType): ISqlBuilder {
    this._databasesProps = { ...this._databasesProps, ...props };
    return this;
  }
  public withNetwork(props: SqlNetworkType): ISqlBuilder {
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
  public withLoginInfo(props: LoginBuilderProps): ISqlAuthBuilder {
    this._loginInfo = props;
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
        policy: "yearly",
        options: { lower: true, upper: true, special: false, numeric: true },
      },
      vaultInfo: this.commonProps.vaultInfo,
    });

    this._loginInfo = { adminLogin: login.userName, password: login.password };
  }

  private buildSql() {
    if (!this._loginInfo) throw new Error("The LoginInfo is required.");
    if (!this.commonProps.vaultInfo)
      throw new Error("The VaultInfo is required.");
    if (
      this._vulnerabilityAssessment &&
      !this._vulnerabilityAssessment.logInfo.secrets
    )
      throw new Error(
        "The LogInfo's secrets are required to enable the vulnerability assessment.",
      );

    this._sqlInstance = Sql({
      ...this.commonProps,
      auth: {
        ...this._authOptions,
        ...this._loginInfo!,
        envRoles: this.commonProps.envRoles,
      },
      vulnerabilityAssessment: this._vulnerabilityAssessment
        ? {
            logStorageId: this._vulnerabilityAssessment.logInfo.id,
            alertEmails: this._vulnerabilityAssessment.alertEmails,
            storageAccessKey:
              this._vulnerabilityAssessment.logInfo.secrets!.primaryKey!,
            storageEndpoint:
              this._vulnerabilityAssessment.logInfo.secrets!.endpoints.blob!,
          }
        : undefined,
      network: this._networkProps,
      elasticPool: this._elasticPoolProps,
      databases: this._databasesProps,
    });
  }

  public build() {
    this.buildLogin();
    this.buildSql();

    return this._sqlInstance!;
  }
}

export default (props: BuilderProps) =>
  new SqlBuilder(props) as ISqlLoginBuilder;
