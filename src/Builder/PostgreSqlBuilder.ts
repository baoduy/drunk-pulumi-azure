import {
  Builder,
  IPostgreSqlBuilder,
  PostgreSqlBuilderArgs,
  IPostgreSqlLoginBuilder,
  PostgreSqlNetworkBuilderType,
  PostgreSqlOptionsBuilderType,
  IPostgreSqlSkuBuilder,
  PostgreSqlSkuBuilderType,
} from './types';
import { IdentityInfoWithInstance, LoginArgs, ResourceInfo } from '../types';
import { isPrd, naming, tenantId } from '../Common';
import { randomLogin } from '../Core/Random';
import * as postgresql from '@pulumi/azure-native/dbforpostgresql';
import * as mid from '@pulumi/azure-native/managedidentity';
import { addEncryptKey } from '../KeyVault/Helper';
import UserAssignedIdentity from '../AzAd/UserAssignedIdentity';
import * as pulumi from '@pulumi/pulumi';
import { convertToIpRange } from '../VNet/Helper';
import { output } from '@pulumi/pulumi';
import { PostgreSqlPrivateLink } from '../VNet';
import { addCustomSecrets } from 'KeyVault';

class PostgreSqlBuilder
  extends Builder<ResourceInfo>
  implements IPostgreSqlSkuBuilder, IPostgreSqlLoginBuilder, IPostgreSqlBuilder {
  private readonly _instanceName: string;
  private _sqlInstance: postgresql.Server | undefined = undefined;
  private _uid: IdentityInfoWithInstance<mid.UserAssignedIdentity> | undefined =
    undefined;

  private _sku: PostgreSqlSkuBuilderType | undefined = undefined;
  private _loginInfo: LoginArgs | undefined = undefined;
  private _generateLogin: boolean = false;
  private _network: PostgreSqlNetworkBuilderType | undefined = undefined;
  private _options: PostgreSqlOptionsBuilderType | undefined = undefined;
  private _databases = new Set<string>();

  constructor(private args: PostgreSqlBuilderArgs) {
    super(args);
    this._instanceName = naming.getPostgresqlName(args.name);
  }

  public withSku(props: PostgreSqlSkuBuilderType): IPostgreSqlLoginBuilder {
    this._sku = props;
    return this;
  }
  public withLogin(props: LoginArgs): IPostgreSqlBuilder {
    this._loginInfo = props;
    return this;
  }
  public generateLogin(): IPostgreSqlBuilder {
    this._generateLogin = true;
    return this;
  }
  public withNetwork(props: PostgreSqlNetworkBuilderType): IPostgreSqlBuilder {
    this._network = props;
    return this;
  }
  public withOptions(props: PostgreSqlOptionsBuilderType): IPostgreSqlBuilder {
    this._options = props;
    return this;
  }
  public withDatabases(...props: string[]): IPostgreSqlBuilder {
    props.forEach((i) => this._databases.add(i));
    return this;
  }

  private buildLogin() {
    const { name, vaultInfo, dependsOn } = this.args;

    if (!this._generateLogin) {
      //The username and password already provided.
      //Just add them to key vault
      if (vaultInfo) {
        addCustomSecrets({
          vaultInfo, dependsOn,
          items: [{
            name: `${this._instanceName}-host}`,
            value: `${this._instanceName}.postgres.database.azure.com`,
          },{
            name: `${this._instanceName}-username}`,
            value: this._loginInfo!.adminLogin,
          },
          {
            name: `${this._instanceName}-pass`,
            value: this._loginInfo!.password
          }]
        });
      }
      return;
    }

    const login = randomLogin({
      name: this._instanceName,
      loginPrefix: name,
      maxUserNameLength: 15,
      passwordOptions: {
        length: 25,
        policy: 'yearly',
        options: { lower: true, upper: true, special: false, numeric: true },
      },
      vaultInfo,
    });
    this._loginInfo = { adminLogin: login.userName, password: login.password };
    login.userName.apply((u) =>
      console.log(`[${this._instanceName}]: The login is ${u}.`),
    );
  }

  private buildUID() {
    const { group, vaultInfo, envRoles, dependsOn } = this.args;
    if (!vaultInfo)
      throw new Error(`${this._instanceName}: The vaultInfo is required.`);

    this._uid = UserAssignedIdentity({
      name: this._instanceName,
      group,
      vaultInfo,
      dependsOn,
    });

    //Allows to Read Key Vault
    envRoles?.addMember('readOnly', this._uid.principalId);
  }

  private buildPostgreSql() {
    const {
      group,
      envUIDInfo,
      vaultInfo,
      enableEncryption,
      dependsOn,
      ignoreChanges = [],
    } = this.args;

    const encryptKey = enableEncryption
      ? addEncryptKey(this._instanceName, vaultInfo!)
      : undefined;

    this._sqlInstance = new postgresql.Server(
      this._instanceName,
      {
        ...group,
        serverName: this._instanceName,
        version: this._sku!.version,
        sku: this._sku!.sku,

        storage: {
          storageSizeGB: this._options?.storageSizeGB ?? 128,
          //autoGrow: isPrd ? 'Enabled' : 'Disabled',
          //autoIoScaling: isPrd ? 'Enabled' : 'Disabled',
        },

        identity: {
          type: postgresql.IdentityType.UserAssigned,
          userAssignedIdentities: output([envUIDInfo?.id, this._uid?.id]).apply(
            ([id1, id2]) => {
              const rs: Record<
                string,
                {}
              > = {};
              if (id1) {
                rs[id1 as string] = {};
              }
              if (id2) {
                rs[id2 as string] = {};
              }
              return rs;
            },
          ),
        },

        //TODO: move this options to out of hard code
        authConfig: {
          passwordAuth: 'Enabled',
          activeDirectoryAuth: 'Disabled',
          tenantId,
        },
        administratorLogin: this._loginInfo!.adminLogin,
        administratorLoginPassword: this._loginInfo!.password,

        dataEncryption: encryptKey
          ? {
            type: 'AzureKeyVault',
            primaryUserAssignedIdentityId: envUIDInfo?.id ?? this._uid!.id,
            primaryKeyUri: encryptKey.url,
          }
          : { type: 'SystemManaged' },

        maintenanceWindow: this._options?.maintenanceWindow ?? {
          customWindow: "Enabled",
          dayOfWeek: 0, //0 is Sunday
          startHour: 0,
          startMinute: 0
        },

        backup: {
          geoRedundantBackup: isPrd ? 'Enabled' : 'Disabled',
          backupRetentionDays: isPrd ? 30 : 7,
        },

        highAvailability: isPrd ? {
          mode: 'ZoneRedundant',
          standbyAvailabilityZone:  '3' ,
        } : undefined,
        availabilityZone: isPrd ? '3' : '1',
      },
      {
        dependsOn: this._uid?.instance ?? dependsOn,
        ignoreChanges: [...ignoreChanges, 'administratorLogin'],
      },
    );
  }

  private buildNetwork() {
    const { group } = this.args;
    if (this._network?.ipAddresses) {
      pulumi.output(this._network.ipAddresses).apply((ips) =>
        convertToIpRange(ips).map(
          (f, i) =>
            new postgresql.FirewallRule(
              `${this._instanceName}-firewall-${i}`,
              {
                ...group,
                firewallRuleName: `${this._instanceName}-firewall-${i}`,
                serverName: this._sqlInstance!.name,
                startIpAddress: f.start,
                endIpAddress: f.end,
              },
              { dependsOn: this._sqlInstance },
            ),
        ),
      );
    }

    if (this._network?.allowsPublicAccess)
      new postgresql.FirewallRule(
        `${this._instanceName}-firewall-allow-public`,
        {
          ...group,
          firewallRuleName: `${this._instanceName}-firewall-allow-public`,
          serverName: this._sqlInstance!.name,
          startIpAddress: '0.0.0.0',
          endIpAddress: '255.255.255.255',
        },
        { dependsOn: this._sqlInstance },
      );

    if (this._network?.privateLink) {
      PostgreSqlPrivateLink({
        ...this._network?.privateLink,
        dependsOn: this._sqlInstance,
        resourceInfo: {
          name: this._instanceName,
          group,
          id: this._sqlInstance!.id,
        },
      });
    }
  }

  private buildDatabases() {
    const { group } = this.args;

    this._databases.forEach(
      (d) =>
        new postgresql.Database(
          `${this._instanceName}-${d}`,
          {
            ...group,
            serverName: this._sqlInstance!.name,
            databaseName: d,
          },
          { dependsOn: this._sqlInstance },
        ),
    );
  }

  public build(): ResourceInfo {
    this.buildLogin();
    this.buildUID();
    this.buildPostgreSql();
    //this.buildAdAdmin();
    this.buildNetwork();
    this.buildDatabases();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._sqlInstance!.id,
    };
  }
}

export default (props: PostgreSqlBuilderArgs) =>
  new PostgreSqlBuilder(props) as IPostgreSqlSkuBuilder;
