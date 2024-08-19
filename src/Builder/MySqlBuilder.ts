import {
  Builder,
  IMySqlBuilder,
  MySqlBuilderArgs,
  IMySqlLoginBuilder,
  MySqlNetworkBuilderType,
  MySqlOptionsBuilderType,
  IMySqlSkuBuilder,
  MySqlSkuBuilderType,
} from './types';
import { IdentityInfoWithInstance, LoginArgs, ResourceInfo } from '../types';
import { isPrd, naming, tenantId } from '../Common';
import { randomLogin } from '../Core/Random';
import * as mysql from '@pulumi/azure-native/dbformysql/v20231230';
import * as mid from '@pulumi/azure-native/managedidentity';
import { addEncryptKey } from '../KeyVault/Helper';
import UserAssignedIdentity from '../AzAd/UserAssignedIdentity';
import * as pulumi from '@pulumi/pulumi';
import { convertToIpRange } from '../VNet/Helper';
import { MySqlPrivateLink } from '../VNet';

class MySqlBuilder
  extends Builder<ResourceInfo>
  implements IMySqlSkuBuilder, IMySqlLoginBuilder, IMySqlBuilder
{
  private readonly _instanceName: string;
  private _mySqlInstance: mysql.Server | undefined = undefined;
  private _uid: IdentityInfoWithInstance<mid.UserAssignedIdentity> | undefined =
    undefined;

  private _sku: MySqlSkuBuilderType | undefined = undefined;
  private _loginInfo: LoginArgs | undefined = undefined;
  private _generateLogin: boolean = false;
  private _network: MySqlNetworkBuilderType | undefined = undefined;
  private _options: MySqlOptionsBuilderType | undefined = undefined;
  private _databases = new Set<string>();

  constructor(private args: MySqlBuilderArgs) {
    super(args);
    this._instanceName = naming.getMySqlName(args.name);
  }

  public withSku(props: MySqlSkuBuilderType): IMySqlLoginBuilder {
    this._sku = props;
    return this;
  }
  public withLogin(props: LoginArgs): IMySqlBuilder {
    this._loginInfo = props;
    return this;
  }
  public generateLogin(): IMySqlBuilder {
    this._generateLogin = true;
    return this;
  }
  public withNetwork(props: MySqlNetworkBuilderType): IMySqlBuilder {
    this._network = props;
    return this;
  }
  public withOptions(props: MySqlOptionsBuilderType): IMySqlBuilder {
    this._options = props;
    return this;
  }
  public withDatabases(...props: string[]): IMySqlBuilder {
    props.forEach((i) => this._databases.add(i));
    return this;
  }

  private buildLogin() {
    if (!this._generateLogin) return;
    const { name, vaultInfo } = this.args;

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

  private buildMySql() {
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

    this._mySqlInstance = new mysql.Server(
      this._instanceName,
      {
        ...group,
        serverName: this._instanceName,
        version: this._sku!.version,
        sku: this._sku!.sku,

        storage: {
          storageSizeGB: this._options?.storageSizeGB ?? 128,
          autoGrow: isPrd ? 'Enabled' : 'Disabled',
          autoIoScaling: isPrd ? 'Enabled' : 'Disabled',
        },

        identity: {
          type: mysql.ManagedServiceIdentityType.UserAssigned,
          userAssignedIdentities: envUIDInfo
            ? [this._uid!.id, envUIDInfo.id]
            : [this._uid!.id],
        },

        administratorLogin: this._loginInfo!.adminLogin,
        administratorLoginPassword: this._loginInfo!.password,

        dataEncryption: encryptKey
          ? {
              type: mysql.DataEncryptionType.AzureKeyVault,
              primaryUserAssignedIdentityId: envUIDInfo?.id ?? this._uid!.id,
              primaryKeyURI: encryptKey.url,
            }
          : { type: mysql.DataEncryptionType.SystemManaged },

        maintenanceWindow: this._options?.maintenanceWindow ?? {
          dayOfWeek: 6,
          startHour: 0,
          startMinute: 0,
        },

        backup: {
          geoRedundantBackup: isPrd ? 'Enabled' : 'Disabled',
          backupRetentionDays: isPrd ? 7 : 1,
        },
        highAvailability: {
          mode: isPrd ? 'ZoneRedundant' : 'Disabled',
          standbyAvailabilityZone: '3',
        },
        availabilityZone: isPrd ? '3' : '1',
      },
      {
        dependsOn: this._uid?.instance ?? dependsOn,
        ignoreChanges: [...ignoreChanges, 'administratorLogin'],
      },
    );
  }

  private buildAdAdmin() {
    const { group, envRoles } = this.args;
    if (!envRoles) return;

    new mysql.AzureADAdministrator(
      this._instanceName,
      {
        ...group,
        administratorName: this._loginInfo!.adminLogin,
        serverName: this._mySqlInstance!.name,

        login: this._loginInfo!.adminLogin,
        administratorType: 'ActiveDirectory',
        sid: envRoles.contributor.objectId,
        tenantId,
      },
      { dependsOn: this._mySqlInstance, ignoreChanges: ['administratorName'] },
    );
  }

  private buildNetwork() {
    const { group } = this.args;
    if (this._network?.ipAddresses) {
      pulumi.output(this._network.ipAddresses).apply((ips) =>
        convertToIpRange(ips).map(
          (f, i) =>
            new mysql.FirewallRule(
              `${this._instanceName}-firewall-${i}`,
              {
                ...group,
                firewallRuleName: `${this._instanceName}-firewall-${i}`,
                serverName: this._mySqlInstance!.name,
                startIpAddress: f.start,
                endIpAddress: f.end,
              },
              { dependsOn: this._mySqlInstance },
            ),
        ),
      );
    }

    if (this._network?.allowsPublicAccess)
      new mysql.FirewallRule(
        `${this._instanceName}-firewall-allow-public`,
        {
          ...group,
          firewallRuleName: `${this._instanceName}-firewall-allow-public`,
          serverName: this._mySqlInstance!.name,
          startIpAddress: '0.0.0.0',
          endIpAddress: '255.255.255.255',
        },
        { dependsOn: this._mySqlInstance },
      );

    if (this._network?.privateLink) {
      MySqlPrivateLink({
        ...this._network?.privateLink,
        dependsOn: this._mySqlInstance,
        resourceInfo: {
          name: this._instanceName,
          group,
          id: this._mySqlInstance!.id,
        },
      });
    }
  }

  private buildDatabases() {
    const { group } = this.args;

    this._databases.forEach(
      (d) =>
        new mysql.Database(
          `${this._mySqlInstance}-${d}`,
          {
            ...group,
            serverName: this._mySqlInstance!.name,
            databaseName: d,
          },
          { dependsOn: this._mySqlInstance },
        ),
    );
  }

  public build(): ResourceInfo {
    this.buildLogin();
    this.buildUID();
    this.buildMySql();
    this.buildAdAdmin();
    this.buildNetwork();
    this.buildDatabases();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._mySqlInstance!.id,
    };
  }
}

export default (props: MySqlBuilderArgs) =>
  new MySqlBuilder(props) as IMySqlSkuBuilder;
