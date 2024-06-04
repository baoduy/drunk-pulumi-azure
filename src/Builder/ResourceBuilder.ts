import {
  BuilderAsyncFunctionType,
  BuilderFunctionType,
  IResourceBuilder,
  IResourceGroupBuilder,
  IResourceRoleBuilder,
  IResourceVaultBuilder,
  ResourceGroupBuilderType,
} from "./types/resourceBuilder";
import { createEnvRoles, EnvRolesResults } from "AzAd/EnvRoles";
import { KeyVaultInfo, ResourceGroupInfo } from "types";
import RG from "../Core/ResourceGroup";
import { ResourceGroup } from "@pulumi/azure-native/resources";
import Vault from "../KeyVault";
import { BuilderProps } from "./types";
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
  private _envRoles: EnvRolesResults | undefined = undefined;
  private _otherBuilders = new Array<BuilderFunctionType>();
  private _otherBuildersAsync = new Array<BuilderAsyncFunctionType>();
  private _vaultInfo: KeyVaultInfo | undefined = undefined;

  //Instances
  private _RGInstance: ResourceGroup | undefined = undefined;
  private _vaultInstance: Resource | undefined = undefined;

  constructor(public name: string) {}

  public createRoles(): IResourceGroupBuilder {
    this._createRole = true;
    return this;
  }
  public withRoles(props: EnvRolesResults): IResourceGroupBuilder {
    this._envRoles = props;
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
    if (!this._createRole) return;
    this._envRoles = createEnvRoles();
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
    this._vaultInfo = rs.toVaultInfo();
    this._vaultInstance = rs.vault;
  }

  private buildOthers() {
    const props: BuilderProps = {
      name: this.name,
      group: this._RGInfo!,
      vaultInfo: this._vaultInfo!,
    };

    this._otherBuilders.map((b) => b(props).build());
  }
  private async buildOthersAsync() {
    const props: BuilderProps = {
      name: this.name,
      group: this._RGInfo!,
      vaultInfo: this._vaultInfo!,
    };

    await Promise.all(this._otherBuildersAsync.map((b) => b(props).build()));
  }

  public async build() {
    this.buildRoles();
    this.buildRG();
    this.buildVault();
    this.buildOthers();
    await this.buildOthersAsync();
  }
}

export default (name: string) =>
  new ResourceBuilder(name) as IResourceRoleBuilder;
