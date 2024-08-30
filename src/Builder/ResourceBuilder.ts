import * as resources from '@pulumi/azure-native/resources';
import { grantEnvRolesAccess } from '../AzAd';
import { EnvRoleBuilder } from './EnvRoleBuilder';
import * as types from './types';
import {
  EnvRolesInfo,
  IdentityInfo,
  KeyVaultInfo,
  LogInfo,
  PrivateLinkPropsType,
  ResourceGroupInfo,
  ResourceInfo,
  RoleEnableTypes,
} from '../types';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { Input } from '@pulumi/pulumi';
import VnetBuilder from './VnetBuilder';
import { VaultNetworkResource } from '@drunk-pulumi/azure-providers';
import { subscriptionId, naming, cleanName, rsInfo } from '../Common';
import {
  CertBuilderType,
  IVaultBuilderResults,
  VaultBuilderSecretFunc,
  VaultBuilderSecretType,
} from './types/vaultBuilder';
import VaultBuilder, { VaultBuilderResults } from './VaultBuilder';
import * as UIDCreator from '../AzAd/Identities/EnvUID';
import { getLogInfo } from '../Logs/Helpers';
import { requireSecret } from '../Common/ConfigHelper';
import { Locker } from '../Core/Locker';
import { VaultPrivateLink } from '../VNet';

class ResourceBuilder
  implements
    types.IResourceRoleBuilder,
    types.IResourceGroupBuilder,
    types.IResourceVaultBuilder,
    types.IResourceBuilder
{
  //Instances
  private _RGInstance: ResourceGroup | undefined = undefined;
  private _otherInstances: Record<string, ResourceInfo> = {};
  private _vnetInstance: types.VnetBuilderResults | undefined = undefined;
  private _otherResources: types.ResourceFunction[] = [];
  private _envUIDInfo: IdentityInfo | undefined = undefined;
  private _logInfo: LogInfo | undefined = undefined;

  //Props
  private _createRGProps: RoleEnableTypes | undefined = undefined;
  private _createRG: boolean = false;
  private _RGInfo: ResourceGroupInfo | undefined = undefined;
  private _lock: boolean = false;
  private _createRole: boolean = false;
  private _createVault: boolean = false;
  private _createVaultName: string | undefined = undefined;
  private _loadRolesFromVault: boolean = false;
  private _envRoles: types.IEnvRoleBuilder | undefined = undefined;
  private _otherBuilders = new Array<types.BuilderFunctionType>();
  private _otherBuildersAsync = new Array<types.BuilderAsyncFunctionType>();
  private _vaultInfo: IVaultBuilderResults | undefined = undefined;
  private _vnetBuilder: types.ResourceVnetBuilderType | undefined = undefined;
  private _secrets: Record<string, Input<string> | VaultBuilderSecretFunc> = {};
  private _certs: Record<string, CertBuilderType> = {};
  private _vaultLinkingProps: PrivateLinkPropsType | undefined = undefined;
  private _enableEncryption: boolean = false;
  private _pushEnvToVault: boolean = false;
  private _createEnvUID: boolean = false;
  private _loadEnvUIDFromVault: boolean = false;
  private _loadLogInfoFrom: string | undefined = undefined;

  constructor(public name: string) {}

  public createRoles(): types.IResourceGroupBuilder {
    this._createRole = true;
    return this;
  }
  public withRoles(props: EnvRolesInfo): types.IResourceGroupBuilder {
    this._envRoles = EnvRoleBuilder.form(props);
    return this;
  }
  /** Create User Assigned Identity for encryption purposes*/
  public createEnvUID(): types.IResourceBuilder {
    this._createEnvUID = true;
    return this;
  }
  /** Create User Assigned Identity for encryption purposes*/
  public withEnvUIDFromVault(): types.IResourceBuilder {
    this._loadEnvUIDFromVault = true;
    return this;
  }
  public withRolesFromVault(): types.IResourceGroupBuilder {
    this._loadRolesFromVault = true;
    return this;
  }
  public createRG(
    props: RoleEnableTypes | undefined = undefined,
  ): types.IResourceVaultBuilder {
    this._createRGProps = props;
    this._createRG = true;
    return this;
  }
  public withRG(props: ResourceGroupInfo): types.IResourceVaultBuilder {
    this._RGInfo = props;
    return this;
  }
  public createVault(
    name: string | undefined = undefined,
  ): types.IResourceBuilder {
    this._createVault = true;
    this._createVaultName = name;
    return this;
  }
  public withVault(props: KeyVaultInfo): types.IResourceBuilder {
    this._vaultInfo = VaultBuilderResults.from(props);
    return this;
  }
  public withVaultFrom(name: string): types.IResourceBuilder {
    return this.withVault(rsInfo.getKeyVaultInfo(name));
  }

  public linkVaultTo(props: PrivateLinkPropsType): types.IResourceBuilder {
    this._vaultLinkingProps = props;
    return this;
  }

  public addSecrets(items: VaultBuilderSecretType): types.IResourceBuilder {
    if (typeof items === 'string') {
      const key = items as string;
      const val = requireSecret(key);
      items = { [key]: val };
    }
    this._secrets = { ...this._secrets, ...items };
    return this;
  }
  public addSecretsIf(
    condition: boolean,
    items: VaultBuilderSecretType,
  ): types.IResourceBuilder {
    if (condition) this.addSecrets(items);
    return this;
  }
  public addCerts(props: CertBuilderType): types.IResourceBuilder {
    this._certs[props.name] = props;
    return this;
  }
  public addCertsIf(
    condition: boolean,
    props: CertBuilderType,
  ): types.IResourceBuilder {
    if (condition) this.addCerts(props);
    return this;
  }
  public withVnet(
    props: types.ResourceVnetBuilderType,
  ): types.IResourceBuilder {
    this._vnetBuilder = props;
    return this;
  }
  public enableEncryption(enabled: boolean = true): types.IResourceBuilder {
    this._enableEncryption = enabled;
    return this;
  }
  public withLogFrom(name: string): types.IResourceBuilder {
    this._loadLogInfoFrom = name;
    return this;
  }
  public withLogFromIf(
    condition: boolean,
    name: string,
  ): types.IResourceBuilder {
    if (condition) this.withLogFrom(name);
    return this;
  }
  public withBuilder(props: types.BuilderFunctionType): types.IResourceBuilder {
    this._otherBuilders.push(props);
    return this;
  }
  public withBuilderIf(
    condition: boolean,
    props: types.BuilderFunctionType,
  ): types.IResourceBuilder {
    if (condition) this.withBuilder(props);
    return this;
  }
  public withBuilderAsync(
    props: types.BuilderAsyncFunctionType,
  ): types.IResourceBuilder {
    this._otherBuildersAsync.push(props);
    return this;
  }
  public withBuilderAsyncIf(
    condition: boolean,
    props: types.BuilderAsyncFunctionType,
  ): types.IResourceBuilder {
    if (condition) this.withBuilder(props);
    return this;
  }
  public withResource(builder: types.ResourceFunction): types.IResourceBuilder {
    this._otherResources.push(builder);
    return this;
  }
  public lock(lock: boolean = true): types.IResourceBuilder {
    this._lock = lock;
    return this;
  }
  private buildEnvRoles() {
    //If the EnvRoles is already provided then no need to re-build it
    if (this._envRoles) return;

    //Create new EnvRoles
    if (this._createRole) {
      this._envRoles = EnvRoleBuilder.create();
      this._pushEnvToVault = true;
    }
    //Load EnvRole from Vault
    else if (this._loadRolesFromVault) {
      this._envRoles = EnvRoleBuilder.loadForm(this._vaultInfo!);
    }
  }

  private buildRG() {
    if (!this._createRG) return;

    const rgName = naming.getResourceGroupName(this.name);
    this._RGInstance = new resources.ResourceGroup(rgName, {
      resourceGroupName: rgName,
    });
    //Collect Info
    this._RGInfo = {
      resourceGroupName: rgName,
      location: this._RGInstance.location,
    };
  }

  private buildPermissions() {
    if (!this._createRG || !this._envRoles) return;
    //Ensure props is configured
    this._createRGProps = this._createRGProps ?? {
      enableRGRoles: { readOnly: Boolean(this._envRoles) },
      enableVaultRoles: this._createVault,
    };
    //grant permission
    grantEnvRolesAccess({
      ...this._createRGProps,
      name: this._RGInfo!.resourceGroupName,
      envRoles: this._envRoles.info(),
      scope: this._RGInstance!.id,
      dependsOn: this._RGInstance,
    });
  }

  private buildVault() {
    //Create Vault
    if (this._createVault) {
      this._vaultInfo = VaultBuilder({
        name: this._createVaultName ?? cleanName(this.name),
        group: this._RGInfo!,
        dependsOn: this._RGInstance,
      }).build();

      //Add Environment Roles to Vault
      if (this._pushEnvToVault) this._envRoles!.pushTo(this._vaultInfo!);
    }

    if (!this._vaultInfo)
      throw new Error(
        'VaultInfo needs to be provided to be continuing to create other resources.',
      );

    //Add Secrets to Vault
    if (this._secrets) this._vaultInfo!.addSecrets(this._secrets);
    if (this._certs) this._vaultInfo!.addCerts(this._certs);
  }

  private buildLogInfo() {
    if (!this._loadLogInfoFrom || this._logInfo) return;
    this._logInfo = getLogInfo(this._loadLogInfoFrom, this._vaultInfo);
  }

  private buildEnvUID() {
    if (!this._vaultInfo) return;

    if (this._createEnvUID)
      this._envUIDInfo = UIDCreator.create(this.getResults());
    else if (this._loadEnvUIDFromVault)
      this._envUIDInfo = UIDCreator.get(this._vaultInfo.info());
  }

  //This linking need to be called after Vnet created
  private buildVaultLinking() {
    if (!this._vaultLinkingProps || !this._vnetInstance) return;

    VaultPrivateLink({
      ...this._vaultLinkingProps,
      resourceInfo: this._vaultInfo!,
    });
  }

  private buildVnet() {
    if (!this._vnetBuilder) return;
    this._vnetInstance = this._vnetBuilder(
      VnetBuilder(this.getResults()),
    ).build();
  }

  private buildOthers() {
    //Other resources
    this._otherResources.forEach((b) => {
      const rs = b(this.getResults());
      this._otherInstances[rs.name] = rs;
    });

    //Other builders
    this._otherBuilders.forEach((b) => {
      const builder = b({
        ...this.getResults(),
        dependsOn: this._vnetInstance?.vnet ?? this._RGInstance,
      });
      this._otherInstances[builder.commonProps.name] = builder.build();
    });
  }

  private async buildOthersAsync() {
    await Promise.all(
      this._otherBuildersAsync.map(async (b) => {
        const builder = b({
          ...this.getResults(),
          dependsOn: this._vnetInstance?.vnet ?? this._RGInstance,
        });
        this._otherInstances[builder.commonProps.name] = await builder.build();
      }),
    );
  }

  private buildLock() {
    if (!this._lock || !this._RGInstance) return;
    Locker({
      name: this._RGInfo!.resourceGroupName,
      resource: this._RGInstance,
    });
  }

  private getResults(): types.ResourceBuilderResults {
    return {
      name: cleanName(this.name),
      group: this._RGInfo!,
      vaultInfo: this._vaultInfo!.info(),
      envRoles: this._envRoles!,
      envUIDInfo: this._envUIDInfo,
      enableEncryption: this._enableEncryption,
      vnetInstance: this._vnetInstance,
      otherInstances: this._otherInstances!,
      logInfo: this._logInfo,
      dependsOn: this._RGInstance,
    };
  }

  public async build(): Promise<types.ResourceBuilderResults> {
    this.buildEnvRoles();
    this.buildRG();
    this.buildPermissions();
    this.buildVault();
    this.buildLogInfo();
    this.buildEnvUID();
    this.buildVnet();
    this.buildVaultLinking();
    this.buildOthers();
    this.buildLock();
    await this.buildOthersAsync();
    return this.getResults();
  }
}

export default (name: string) =>
  new ResourceBuilder(name) as types.IResourceRoleBuilder;
