import {
  BuilderAsyncFunctionType,
  BuilderFunctionType,
  IResourceBuilder,
  IResourceGroupBuilder,
  IResourceRoleBuilder,
  IResourceVaultBuilder,
  ResourceBuilderResults,
  ResourceFunction,
  ResourceGroupBuilderType,
  ResourceVaultLinkingBuilderType,
  ResourceVnetBuilderType,
  VnetBuilderResults,
} from "./types";
import {
  createEnvRoles,
  CreateEnvRolesType,
  EnvRolesResults,
  getEnvRolesOutput,
} from "../AzAd/EnvRoles";
import { KeyVaultInfo, ResourceGroupInfo, ResourceInfo } from "../types";
import RG from "../Core/ResourceGroup";
import { ResourceGroup } from "@pulumi/azure-native/resources";
import { createVaultPrivateLink } from "../KeyVault";
import { Input } from "@pulumi/pulumi";
import VnetBuilder from "./VnetBuilder";
import { VaultNetworkResource } from "@drunk-pulumi/azure-providers";
import { subscriptionId } from "../Common/AzureEnv";
import { IVaultBuilderResults } from "./types/vaultBuilder";
import { VaultBuilderResults } from "./VaultBuilder";
import VaultBuilder from "./VaultBuilder";

class ResourceBuilder
  implements
    IResourceRoleBuilder,
    IResourceGroupBuilder,
    IResourceVaultBuilder,
    IResourceBuilder
{
  private _createRGProps: ResourceGroupBuilderType | undefined = undefined;
  private _RGInfo: ResourceGroupInfo | undefined = undefined;
  private _lock: boolean = false;
  private _createRole: boolean = false;
  private _createVault: boolean = false;
  private _loadRolesFromVault: boolean = false;
  private _envRoles: EnvRolesResults | undefined = undefined;
  private _otherBuilders = new Array<BuilderFunctionType>();
  private _otherBuildersAsync = new Array<BuilderAsyncFunctionType>();
  private _vaultInfo: IVaultBuilderResults | undefined = undefined;
  private _vnetBuilder: ResourceVnetBuilderType | undefined = undefined;
  private _secrets: Record<string, Input<string>> = {};
  private _vaultLinkingProps: ResourceVaultLinkingBuilderType | undefined =
    undefined;
  private _otherResources: ResourceFunction[] = [];

  //Instances
  private _RGInstance: ResourceGroup | undefined = undefined;
  private _envRolesInstance: CreateEnvRolesType | undefined = undefined;
  private _otherInstances: Record<string, ResourceInfo> = {};
  private _vnetInstance: VnetBuilderResults | undefined = undefined;

  constructor(public name: string) {}

  public createRoles(): IResourceGroupBuilder {
    this._createRole = true;
    return this;
  }
  public withRoles(props: EnvRolesResults): IResourceGroupBuilder {
    this._envRoles = props;
    return this;
  }
  public withRolesFromVault(): IResourceGroupBuilder {
    this._loadRolesFromVault = true;
    return this;
  }
  public createRG(props: ResourceGroupBuilderType): IResourceVaultBuilder {
    this._createRGProps = props;
    return this;
  }
  public withRG(props: ResourceGroupInfo): IResourceVaultBuilder {
    this._RGInfo = props;
    return this;
  }
  public createVault(): IResourceBuilder {
    this._createVault = true;
    return this;
  }
  public withVault(props: KeyVaultInfo): IResourceBuilder {
    this._vaultInfo = VaultBuilderResults.from(props);
    return this;
  }
  public linkVaultTo(props: ResourceVaultLinkingBuilderType): IResourceBuilder {
    this._vaultLinkingProps = props;
    return this;
  }
  public addSecrets(items: Record<string, Input<string>>): IResourceBuilder {
    this._secrets = { ...this._secrets, ...items };
    return this;
  }

  public withVnet(props: ResourceVnetBuilderType): IResourceBuilder {
    this._vnetBuilder = props;
    return this;
  }
  public withBuilder(props: BuilderFunctionType): IResourceBuilder {
    this._otherBuilders.push(props);
    return this;
  }
  public withBuilderAsync(props: BuilderAsyncFunctionType): IResourceBuilder {
    this._otherBuildersAsync.push(props);
    return this;
  }
  public withResource(builder: ResourceFunction): IResourceBuilder {
    this._otherResources.push(builder);
    return this;
  }
  public lock(): IResourceBuilder {
    this._lock = true;
    return this;
  }

  private buildRoles() {
    if (this._createRole) {
      this._envRolesInstance = createEnvRoles();
      this._envRoles = this._envRolesInstance;
    } else if (this._loadRolesFromVault) {
      if (!this._vaultInfo)
        throw new Error(
          "The KeyVaultInfo needs to be defined to load environment Roles info.",
        );
      this._envRoles = getEnvRolesOutput(this._vaultInfo!.info());
    }
  }

  private buildRG() {
    if (!this._createRGProps) return;

    const rs = RG({
      name: this.name,
      permissions: {
        envRoles: this._envRoles!,
        ...this._createRGProps,
      },
      lock: this._lock,
    });
    this._RGInfo = rs.info();
    this._RGInstance = rs.resource;
  }

  private buildVault() {
    //Create Vault
    if (this._createVault) {
      this._vaultInfo = VaultBuilder({
        name: this.name,
        group: this._RGInfo!,
        envRoles: this._envRoles!,
        dependsOn: this._RGInstance,
      }).build();

      //Add Environment Roles to Vault
      if (this._envRolesInstance)
        this._envRolesInstance.addRolesToVault(this._vaultInfo!.info());
    }

    if (!this._vaultInfo)
      throw new Error(
        "VaultInfo needs to be provided to be continuing to create other resources.",
      );

    //Add Secrets to Vaults
    if (this._secrets) this._vaultInfo!.addSecrets(this._secrets);
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
        name: `${this.name}-vault`,
        vaultInfo: this._vaultInfo!.info(),
        subnetIds: subIds,
      });
    } else {
      new VaultNetworkResource(
        `${this.name}-vault`,
        {
          vaultName: this._vaultInfo!.info()!.name,
          resourceGroupName: this._vaultInfo!.info()!.group.resourceGroupName,
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
      this._otherInstances[rs.resourceName] = rs;
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

  private getResults(): ResourceBuilderResults {
    return {
      name: this.name,
      group: this._RGInfo!,
      vaultInfo: this._vaultInfo!.info(),
      envRoles: this._envRoles!,
      vnetInstance: this._vnetInstance,
      otherInstances: this._otherInstances!,
      dependsOn: this._RGInstance,
    };
  }

  public async build(): Promise<ResourceBuilderResults> {
    this.buildRoles();
    this.buildRG();
    this.buildVault();
    this.buildVnet();
    this.buildVaultLinking();
    this.buildOthers();
    await this.buildOthersAsync();
    return this.getResults();
  }
}

export default (name: string) =>
  new ResourceBuilder(name) as IResourceRoleBuilder;
