import {
  AppConfigBuilderArgs,
  AppConfigNetworkType,
  AppConfigOptionsBuilder,
  Builder,
  IAppConfigBuilder,
} from './types';
import env from '../env';
import { ResourceInfo } from '../types';
import { isPrd, naming } from '../Common';
import * as appConfig from '@pulumi/azure-native/appconfiguration';
import { addEncryptKey } from '../KeyVault';
import { addCustomSecret } from '../KeyVault';
import { AppConfigPrivateLink } from '../VNet';

class AppConfigBuilder
  extends Builder<ResourceInfo>
  implements IAppConfigBuilder
{
  private readonly _instanceName: string;
  private _appConfigInstance: appConfig.ConfigurationStore | undefined =
    undefined;

  private _privateLink: AppConfigNetworkType | undefined = undefined;
  private _options: AppConfigOptionsBuilder = {
    enablePurgeProtection: isPrd,
    //Min is 1 and max is 7
    softDeleteRetentionInDays: isPrd ? 7 : 1,
  };

  constructor(private args: AppConfigBuilderArgs) {
    super(args);
    this._instanceName = naming.getAppConfigName(args.name);
  }

  public withOptions(props: AppConfigOptionsBuilder): IAppConfigBuilder {
    this._options = { ...this._options, ...props };
    return this;
  }

  public withPrivateLink(props: AppConfigNetworkType): IAppConfigBuilder {
    this._privateLink = props;
    return this;
  }
  public withPrivateLinkIf(
    condition: boolean,
    props: AppConfigNetworkType,
  ): IAppConfigBuilder {
    if (condition) this.withPrivateLink(props);
    return this;
  }

  private buildAppConfig() {
    const {
      group,
      envUIDInfo,
      vaultInfo,
      enableEncryption,
      dependsOn,
      ignoreChanges = [],
    } = this.args;

    const encryptionKey = enableEncryption
      ? addEncryptKey(this._instanceName, vaultInfo!)
      : undefined;

    this._appConfigInstance = new appConfig.ConfigurationStore(
      this._instanceName,
      {
        ...group,
        ...this._options,
        configStoreName: this._instanceName,
        sku: { name: 'Standard' },

        disableLocalAuth: this._privateLink?.disableLocalAuth,
        publicNetworkAccess:
          !this._privateLink || this._privateLink.allowsPublicAccess
            ? appConfig.PublicNetworkAccess.Enabled
            : appConfig.PublicNetworkAccess.Disabled,

        identity: {
          type: envUIDInfo
            ? appConfig.IdentityType.SystemAssigned_UserAssigned
            : appConfig.IdentityType.SystemAssigned,
          userAssignedIdentities: envUIDInfo ? [envUIDInfo.id] : undefined,
        },

        encryption:
          encryptionKey && envUIDInfo
            ? {
                keyVaultProperties: {
                  identityClientId: envUIDInfo.clientId,
                  keyIdentifier: encryptionKey.urlWithoutVersion,
                },
              }
            : undefined,
      },
      {
        dependsOn,
        ignoreChanges: [
          ...ignoreChanges,
          'softDeleteRetentionInDays',
          'enablePurgeProtection',
        ],
      },
    );
  }

  private buildPrivateLink() {
    if (!this._privateLink) return;
    AppConfigPrivateLink({
      ...this._privateLink,
      dependsOn: this._appConfigInstance,
      resourceInfo: {
        name: this._instanceName,
        group: this.args.group,
        id: this._appConfigInstance!.id,
      },
    });
  }

  private buildSecrets() {
    const { vaultInfo } = this.args;
    if (!vaultInfo || this._privateLink?.disableLocalAuth) return;

    this._appConfigInstance!.id.apply(async (id) => {
      if (!id) return;
      //Load the  keys from Azure
      const keys = await appConfig.listConfigurationStoreKeys({
        configStoreName: this._instanceName,
        ...this.args.group,
      });

      if (keys.value) {
        const readPrimaryConnectionStringKey = env.DPA_CONN_ENABLE_SECONDARY
          ? `${this._instanceName}-read-conn-primary`
          : `${this._instanceName}-read-conn`;
        const readSecondaryConnectionStringKey = `${this._instanceName}-read-conn-secondary`;

        keys.value.forEach((key) => {
          if (!env.DPA_CONN_ENABLE_SECONDARY && !key.name.includes('Primary'))
            return;
          //Only Read Connection String here
          if (key.readOnly) {
            addCustomSecret({
              name: key.name.includes('Primary')
                ? readPrimaryConnectionStringKey
                : readSecondaryConnectionStringKey,
              value: key.connectionString,
              contentType: `AppConfig ${this._instanceName} ${key.name}`,
              vaultInfo,
              dependsOn: this._appConfigInstance,
            });
          }
        });
      }
    });
  }

  public build(): ResourceInfo {
    this.buildAppConfig();
    this.buildPrivateLink();
    this.buildSecrets();
    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._appConfigInstance!.id,
    };
  }
}

export default (props: AppConfigBuilderArgs) =>
  new AppConfigBuilder(props) as IAppConfigBuilder;
