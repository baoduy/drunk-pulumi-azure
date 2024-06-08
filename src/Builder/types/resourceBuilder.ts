import { EnvRolesResults } from "../../AzAd/EnvRoles";
import { RGPermissionType } from "../../Core/ResourceGroup";
import { KeyVaultInfo, ResourceGroupInfo } from "../../types";
import { IBuilder, IBuilderAsync, BuilderProps } from "./genericBuilder";
import {
  IVnetBuilder,
  IVnetBuilderStart,
  VnetBuilderResults,
} from "./vnetBuilder";
import { Input } from "@pulumi/pulumi";

export type ResourceBuilderResults = BuilderProps & {
  envRoles: EnvRolesResults;
  vnetInstance?: VnetBuilderResults;
  otherInstances: Record<string, any>;
};
export type ResourceGroupBuilderType = Omit<RGPermissionType, "envRoles">;
export type BuilderFunctionType = (
  props: ResourceBuilderResults,
) => IBuilder<any>;
export type OtherBuilderType = Record<string, BuilderFunctionType>;
export type BuilderAsyncFunctionType = (
  props: ResourceBuilderResults,
) => IBuilderAsync<any>;
export type OtherAsyncBuilderType = Record<string, BuilderAsyncFunctionType>;
export type ResourceVnetBuilderType = (
  builder: IVnetBuilderStart,
) => IVnetBuilder;
export type ResourceVaultPrivateLinkBuilderType = {
  /** Either subnet name or id need to be provided */
  subnetName?: string;
  /** Either subnet name or id need to be provided */
  subnetId?: Input<string>;
};
export type ResourceVaultLinkingBuilderType =
  ResourceVaultPrivateLinkBuilderType & {
    /** Link as private link to Subnet or just Vnet Linking*/
    asPrivateLink?: boolean;
    allowsAzureService?: boolean;
    allowsIpAddresses?: Input<string>[];
  };

export interface IResourceRoleBuilder {
  createRoles: () => IResourceGroupBuilder;
  withRoles: (props: EnvRolesResults) => IResourceGroupBuilder;
  withRolesFromVault: () => IResourceGroupBuilder;
}

export interface IResourceGroupBuilder {
  createRG: (props: ResourceGroupBuilderType) => IResourceVaultBuilder;
  withRG: (props: ResourceGroupInfo) => IResourceVaultBuilder;
}

export interface IResourceVaultBuilder {
  createVault: (props?: ResourceVaultLinkingBuilderType) => IResourceBuilder;
  withVault: (props: KeyVaultInfo) => IResourceBuilder;
}
export interface IResourceVaultItemsBuilder {
  addSecrets: (items: Record<string, Input<string>>) => IResourceBuilder;
  //addKeys: () => IResourceBuilder;
  //addCerts:() => IResourceBuilder;
}
export interface IResourceVnetBuilder {
  withVnet: (props: ResourceVnetBuilderType) => IResourceBuilder;
  linkVaultTo: (props: ResourceVaultPrivateLinkBuilderType) => IResourceBuilder;
}
export interface IResourceBuilder
  extends IResourceVnetBuilder,
    IResourceVaultItemsBuilder {
  lock: () => IResourceBuilder;
  withBuilder: (builders: OtherBuilderType) => IResourceBuilder;
  withBuilderAsync: (builders: OtherAsyncBuilderType) => IResourceBuilder;
  build: () => Promise<ResourceBuilderResults>;
}
