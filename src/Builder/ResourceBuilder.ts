import {
  BuilderAsyncFunctionType,
  BuilderFunctionType,
  IResourceBuilder,
  IResourceGroupBuilder,
  IResourceRoleBuilder,
  IResourceVaultBuilder,
  ResourceBuilderResults,
  ResourceGroupBuilderType,
  ResourceVaultLinkingBuilderType,
  ResourceVaultPrivateLinkBuilderType,
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
import Vault, { createVaultPrivateLink } from "../KeyVault";
import { CustomResource, Input } from "@pulumi/pulumi";
import VnetBuilder from "./VnetBuilder";
import { addCustomSecret } from "../KeyVault/CustomHelper";
import { VaultNetworkResource } from "@drunk-pulumi/azure-providers";
import { subscriptionId } from "../Common/AzureEnv";

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
  private _vaultInfo: KeyVaultInfo | undefined = undefined;
  private _vnetBuilder: ResourceVnetBuilderType | undefined = undefined;
  private _secrets: Record<string, Input<string>> = {};
  private _vaultLinkingProps: ResourceVaultLinkingBuilderType | undefined =
    undefined;

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
  public createVault(
    props?: ResourceVaultLinkingBuilderType,
  ): IResourceBuilder {
    this._createVault = true;
    this._vaultLinkingProps = props;
    return this;
  }
  public withVault(props: KeyVaultInfo): IResourceBuilder {
    this._vaultInfo = props;
    return this;
  }
  public linkVaultTo(
    props: ResourceVaultPrivateLinkBuilderType,
  ): IResourceBuilder {
    this._vaultLinkingProps = { ...props, asPrivateLink: true };
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
  public lock(): IResourceBuilder {
    this._lock = true;
    return this;
  }

  private validate() {
    if (
      this._vaultLinkingProps &&
      !this._vaultLinkingProps.subnetName &&
      !this._vaultLinkingProps.subnetName
    ) {
      throw new Error(
        "Either subnetName or subnetId needs to be provided for Vault private link.",
      );
    }
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
    //Create Vault
    if (this._createVault) {
      const rs = Vault({
        name: this.name,
        group: this._RGInfo!,
        dependsOn: this._RGInstance,
      });

      this._vaultInstance = rs.vault;
      this._vaultInfo = rs.toVaultInfo();

      //Add Environment Roles to Vault
      if (this._envRolesInstance)
        this._envRolesInstance.addRolesToVault(this._vaultInfo);
    }

    //Add Secrets to Vaults
    Object.keys(this._secrets).forEach((key) => {
      const val = this._secrets[key];
      addCustomSecret({
        name: key,
        value: val,
        contentType: `${this.name}-${key}`,
        vaultInfo: this._vaultInfo!,
        dependsOn: this._vaultInstance,
      });
    });
  }

  //This linking need to be called after Vnet created
  private buildVaultLinking() {
    if (!this._vaultLinkingProps || !this._vnetInstance) return;
    const { asPrivateLink, allowsIpAddresses, subnetName, subnetId } =
      this._vaultLinkingProps;

    const subId = subnetId
      ? subnetId
      : subnetName
        ? this._vnetInstance!.findSubnet(subnetName)!.apply((s) => s!.id!)
        : undefined;

    if (asPrivateLink && subId) {
      createVaultPrivateLink({
        name: `${this.name}-vault`,
        vaultInfo: this._vaultInfo!,
        subnetIds: [subId],
      });
    } else {
      new VaultNetworkResource(`${this.name}-vault`, {
        vaultName: this._vaultInfo!.name,
        resourceGroupName: this._vaultInfo!.group.resourceGroupName,
        subscriptionId,
        subnetIds: subId ? [subId] : undefined,
        ipAddresses: allowsIpAddresses,
      });
    }
  }

  private buildVnet() {
    if (!this._vnetBuilder) return;
    this._vnetInstance = this._vnetBuilder(
      VnetBuilder(this.getResults()),
    ).build();
  }

  private buildOthers() {
    this._otherBuilders.forEach((b) => {
      const builder = b({
        ...this.getResults(),
        dependsOn: this._vaultInstance ?? this._vnetInstance?.vnet,
      });
      this._otherInstances[builder.commonProps.name] = builder.build();
    });
  }

  private async buildOthersAsync() {
    await Promise.all(
      this._otherBuildersAsync.map(async (b) => {
        const builder = b({
          ...this.getResults(),
          dependsOn: this._vaultInstance ?? this._vnetInstance?.vnet,
        });
        this._otherInstances[builder.commonProps.name] = await builder.build();
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
    this.validate();
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
