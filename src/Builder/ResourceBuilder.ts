import {
  BuilderAsyncFunctionType,
  BuilderFunctionType,
  IResourceBuilder,
  IResourceGroupBuilder,
  IResourceRoleBuilder,
  IResourceVaultBuilder,
  ResourceGroupBuilderType,
  BuilderProps,
  ResourceBuilderResults,
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
import { Resource } from "@pulumi/pulumi";

class ResourceBuilder
  implements
    IResourceRoleBuilder,
    IResourceGroupBuilder,
    IResourceVaultBuilder,
    IResourceBuilder
{
  private _createRGProps: ResourceGroupBuilderType | undefined = undefined;
  private _RGInfo: ResourceGroupInfo | undefined = undefined;
  private _createRole: boolean = false;
  private _createVault: boolean = false;
  private _loadRolesFromVault: boolean = false;
  private _envRoles: EnvRolesResults | undefined = undefined;
  private _otherBuilders = new Array<BuilderFunctionType>();
  private _otherBuildersAsync = new Array<BuilderAsyncFunctionType>();
  private _vaultInfo: KeyVaultInfo | undefined = undefined;

  //Instances
  private _RGInstance: ResourceGroup | undefined = undefined;
  private _vaultInstance: Resource | undefined = undefined;
  private _envRolesInstance: CreateEnvRolesType | undefined = undefined;
  private _otherInstances = new Array<any>();

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
  public withBuilder(builder: BuilderFunctionType) {
    this._otherBuilders.push(builder);
    return this;
  }
  public withBuilderAsync(builder: BuilderAsyncFunctionType) {
    this._otherBuildersAsync.push(builder);
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
    });
    this._RGInfo = rs.toGroupInfo();
    this._RGInstance = rs.resource;
  }

  private buildVault() {
    if (!this._createVault) return;
    const rs = Vault({
      name: this.name,
      group: this._RGInfo!,
    });
    this._vaultInstance = rs.vault;
    this._vaultInfo = rs.toVaultInfo();

    if (this._envRolesInstance)
      this._envRolesInstance.addRolesToVault(this._vaultInfo);
  }

  private buildOthers() {
    const props: BuilderProps = {
      name: this.name,
      group: this._RGInfo!,
      vaultInfo: this._vaultInfo!,
    };

    const rs = this._otherBuilders.map((b) => b(props).build());
    this._otherInstances.push(...rs);
  }

  private async buildOthersAsync() {
    const props: BuilderProps = {
      name: this.name,
      group: this._RGInfo!,
      vaultInfo: this._vaultInfo!,
    };

    const rs = await Promise.all(
      this._otherBuildersAsync.map((b) => b(props).build()),
    );
    this._otherInstances.push(...rs);
  }

  public async build(): Promise<ResourceBuilderResults> {
    this.buildRoles();
    this.buildRG();
    this.buildVault();
    this.buildOthers();
    await this.buildOthersAsync();

    return {
      name: this.name,
      group: this._RGInfo!,
      vaultInfo: this._vaultInfo!,
      envRoles: this._envRoles!,
      others: this._otherInstances!,
    };
  }
}

export default (name: string) =>
  new ResourceBuilder(name) as IResourceRoleBuilder;
