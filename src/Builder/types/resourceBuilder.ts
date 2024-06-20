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
import { IVaultBuilderResults } from "./vaultBuilder";

export type ResourceBuilderResults = BuilderProps & {
  envRoles: EnvRolesResults;
  vnetInstance?: VnetBuilderResults;
  otherInstances: Record<string, any>;
};
export type ResourceGroupBuilderType = Omit<RGPermissionType, "envRoles">;
export type BuilderFunctionType = (
  props: ResourceBuilderResults,
) => IBuilder<any>;
export type BuilderAsyncFunctionType = (
  props: ResourceBuilderResults,
) => IBuilderAsync<any>;
export type ResourceVnetBuilderType = (
  builder: IVnetBuilderStart,
) => IVnetBuilder;

export type ResourceVaultLinkingBuilderType = {
  subnetNames?: string[];
  ipAddresses?: Input<string>[];
  asPrivateLink?: boolean;
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
  createVault: () => IResourceBuilder;
  withVault: (props: KeyVaultInfo) => IResourceBuilder;
}

export interface IResourceVaultItemsBuilder {
  addSecrets: (items: Record<string, Input<string>>) => IResourceBuilder;
  //addKeys: () => IResourceBuilder;
  //addCerts:() => IResourceBuilder;
}

export interface IResourceVnetBuilder {
  withVnet: (props: ResourceVnetBuilderType) => IResourceBuilder;
  linkVaultTo: (props: ResourceVaultLinkingBuilderType) => IResourceBuilder;
}
export interface IResourceBuilder
  extends IResourceVnetBuilder,
    IResourceVaultItemsBuilder {
  lock: () => IResourceBuilder;
  withBuilder: (props: BuilderFunctionType) => IResourceBuilder;
  withBuilderAsync: (props: BuilderAsyncFunctionType) => IResourceBuilder;
  build: () => Promise<ResourceBuilderResults>;
}
