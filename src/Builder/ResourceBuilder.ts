import {
  IResourceBuilder,
  IResourceGroupBuilder,
  IResourceRoleBuilder,
  IResourceVaultBuilder,
  OtherAsyncBuilderType,
  OtherBuilderType,
  ResourceBuilderResults,
  ResourceGroupBuilderType,
  ResourceVnetBuilderType,
  VnetBuilderResults,
} from "./types";
import {
  createEnvRoles,
  CreateEnvRolesType,
  EnvRolesResults,
  getEnvRolesOutput,
} from "../AzAd/EnvRoles";
import { KeyVaultInfo, ResourceGroupInfo } from "../types";
import RG from "../Core/ResourceGroup";
import { ResourceGroup } from "@pulumi/azure-native/resources";
import Vault from "../KeyVault";
import { CustomResource, Resource } from "@pulumi/pulumi";
import VnetBuilder from "./VnetBuilder";

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
  private _otherBuilders: OtherBuilderType = {};
  private _otherBuildersAsync: OtherAsyncBuilderType = {};
  private _vaultInfo: KeyVaultInfo | undefined = undefined;
  private _vnetBuilder: ResourceVnetBuilderType | undefined = undefined;

  //Instances
  private _RGInstance: ResourceGroup | undefined = undefined;
  private _vaultInstance: CustomResource | undefined = undefined;
  private _envRolesInstance: CreateEnvRolesType | undefined = undefined;
  private _otherInstances: Record<string, any> = {};
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
    this._vaultInfo = props;
    return this;
  }
  public withVnet(props: ResourceVnetBuilderType): IResourceBuilder {
    this._vnetBuilder = props;
    return this;
  }
  public withBuilder(builders: OtherBuilderType): IResourceBuilder {
    this._otherBuilders = { ...this._otherBuilders, ...builders };
    return this;
  }
  public withBuilderAsync(builders: OtherAsyncBuilderType): IResourceBuilder {
    this._otherBuildersAsync = { ...this._otherBuildersAsync, ...builders };
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
      this._envRoles = getEnvRolesOutput(this._vaultInfo);
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
    this._RGInfo = rs.toGroupInfo();
    this._RGInstance = rs.resource;
  }

  private buildVault() {
    if (!this._createVault) return;
    const rs = Vault({
      name: this.name,
      group: this._RGInfo!,
      dependsOn: this._RGInstance,
    });
    this._vaultInstance = rs.vault;
    this._vaultInfo = rs.toVaultInfo();

    if (this._envRolesInstance)
      this._envRolesInstance.addRolesToVault(this._vaultInfo);
  }

  private buildVnet() {
    if (!this._vnetBuilder) return;
    this._vnetInstance = this._vnetBuilder(
      VnetBuilder(this.getResults()),
    ).build();
  }

  private buildOthers() {
    Object.keys(this._otherBuilders).forEach((key) => {
      const b = this._otherBuilders[key];
      this._otherInstances[key] = b({
        ...this.getResults(),
        name: `${this.name}-${key}`,
        dependsOn: this._vaultInstance ?? this._vnetInstance?.vnet,
      }).build();
    });
  }

  private async buildOthersAsync() {
    await Promise.all(
      Object.keys(this._otherBuildersAsync).map(async (key) => {
        const b = this._otherBuildersAsync[key];
        this._otherInstances[key] = await b({
          ...this.getResults(),
          name: `${this.name}-${key}`,
          dependsOn: this._vaultInstance ?? this._vnetInstance?.vnet,
        }).build();
      }),
    );
  }

  private getResults(): ResourceBuilderResults {
    return {
      name: this.name,
      group: this._RGInfo!,
      vaultInfo: this._vaultInfo!,
      envRoles: this._envRoles!,
      vnetInstance: this._vnetInstance,
      otherInstances: this._otherInstances!,
    };
  }

  public async build(): Promise<ResourceBuilderResults> {
    this.buildRoles();
    this.buildRG();
    this.buildVault();
    this.buildVnet();
    this.buildOthers();
    await this.buildOthersAsync();

    return this.getResults();
  }
}

export default (name: string) =>
  new ResourceBuilder(name) as IResourceRoleBuilder;
