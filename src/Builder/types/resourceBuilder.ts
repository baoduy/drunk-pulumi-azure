import { EnvRolesResults } from "../../AzAd/EnvRoles";
import { RGPermissionType } from "../../Core/ResourceGroup";
import { KeyVaultInfo, ResourceGroupInfo } from "../../types";
import { IBuilder, IBuilderAsync, BuilderProps } from "./genericBuilder";

export type ResourceBuilderResults = BuilderProps & {
  envRoles: EnvRolesResults;
  instances: Record<string, any>;
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

export interface IResourceBuilder {
  withBuilder: (builders: OtherBuilderType) => IResourceBuilder;
  withBuilderAsync: (builders: OtherAsyncBuilderType) => IResourceBuilder;
  build: () => Promise<ResourceBuilderResults>;
}
