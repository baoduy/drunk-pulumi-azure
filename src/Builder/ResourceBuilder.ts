import { RoleEnableTypes } from '../AzAd/EnvRoles.Consts';
import { EnvRoleBuilder } from './EnvRoleBuilder';
import * as types from './types';
import { EnvRolesInfo } from '../AzAd/EnvRoles';
import {
  IdentityInfo,
  KeyVaultInfo,
  LogInfo,
  ResourceGroupInfo,
  ResourceInfo,
} from '../types';
import RG from '../Core/ResourceGroup';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { createVaultPrivateLink } from '../KeyVault';
import { Input } from '@pulumi/pulumi';
import VnetBuilder from './VnetBuilder';
import { VaultNetworkResource } from '@drunk-pulumi/azure-providers';
import { subscriptionId, getKeyVaultInfo, cleanName } from '../Common';
import {
  CertBuilderType,
  IVaultBuilderResults,
  VaultBuilderSecretType,
} from './types/vaultBuilder';
import VaultBuilder, { VaultBuilderResults } from './VaultBuilder';
import * as UIDCreator from '../AzAd/Identities/EnvUID';
import { getLogInfo } from '../Logs/Helpers';
import { requireSecret } from '../Common/ConfigHelper';

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
  private _secrets: Record<string, Input<string>> = {};
  private _certs: Record<string, CertBuilderType> = {};
  private _vaultLinkingProps:
    | types.ResourceVaultLinkingBuilderType
    | undefined = undefined;
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
    return this.withVault(getKeyVaultInfo(name));
  }

  public linkVaultTo(
    props: types.ResourceVaultLinkingBuilderType,
  ): types.IResourceBuilder {
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
  public addCerts(props: CertBuilderType): types.IResourceBuilder {
    this._certs[props.name] = props;
    return this;
  }

  public withVnet(
    props: types.ResourceVnetBuilderType,
  ): types.IResourceBuilder {
    this._vnetBuilder = props;
    return this;
  }
  public enableEncryption(): types.IResourceBuilder {
    this._enableEncryption = true;
    return this;
  }
  public withLogFrom(name: string): types.IResourceBuilder {
    this._loadLogInfoFrom = name;
    return this;
  }

  public withBuilder(props: types.BuilderFunctionType): types.IResourceBuilder {
    this._otherBuilders.push(props);
    return this;
  }
  public withBuilderAsync(
    props: types.BuilderAsyncFunctionType,
  ): types.IResourceBuilder {
    this._otherBuildersAsync.push(props);
    return this;
  }
  public withResource(builder: types.ResourceFunction): types.IResourceBuilder {
    this._otherResources.push(builder);
    return this;
  }
  public lock(): types.IResourceBuilder {
    this._lock = true;
    return this;
  }
  private buildRoles() {
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
    if (!this._createRGProps)
      this._createRGProps = {
        enableRGRoles: { readOnly: Boolean(this._envRoles) },
        enableVaultRoles: this._createVault,
      };

    const rs = RG({
      name: this.name,
      permissions: {
        envRoles: this._envRoles!,
        ...this._createRGProps,
      },
      lock: this._lock,
    });
    //Collect Info
    this._RGInfo = rs.info();
    this._RGInstance = rs.instance;
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

    //Add Secrets to Vaults
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
    const { asPrivateLink, subnetNames, ipAddresses } = this._vaultLinkingProps;

    const subIds =
      subnetNames?.map(
        (name: string) =>
          this._vnetInstance?.findSubnet(name)!.apply((s) => s!.id!)!,
      ) ?? [];

    if (asPrivateLink && subIds.length > 0) {
      createVaultPrivateLink({
        vaultInfo: this._vaultInfo!,
        subnetIds: subIds,
      });
    } else {
      new VaultNetworkResource(
        `${this.name}-vault`,
        {
          vaultName: this._vaultInfo!.name,
          resourceGroupName: this._vaultInfo!.group.resourceGroupName,
          subscriptionId,
          subnetIds: subIds,
          ipAddresses: ipAddresses,
        },
        { dependsOn: this._RGInstance ?? this._vnetInstance?.vnet },
      );
    }
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
    this.buildRoles();
    this.buildRG();
    this.buildVault();
    this.buildLogInfo();
    this.buildEnvUID();
    this.buildVnet();
    this.buildVaultLinking();
    this.buildOthers();
    await this.buildOthersAsync();
    return this.getResults();
  }
}

export default (name: string) =>
  new ResourceBuilder(name) as types.IResourceRoleBuilder;
