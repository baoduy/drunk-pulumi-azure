import { EnvRolesResults } from "../../AzAd/EnvRoles";
import { RGPermissionType } from "../../Core/ResourceGroup";
import { KeyVaultInfo, ResourceGroupInfo } from "../../types";
import { IBuilder, IBuilderAsync, BuilderProps } from "./genericBuilder";

export type ResourceBuilderResults = BuilderProps & {
  envRoles: EnvRolesResults;
  others: Array<any>;
};
export type ResourceGroupBuilderType = Omit<RGPermissionType, "envRoles">;
export type BuilderFunctionType = (props: BuilderProps) => IBuilder<any>;
export type BuilderAsyncFunctionType = (
  props: BuilderProps,
) => IBuilderAsync<any>;

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
  withBuilder: (builder: BuilderFunctionType) => IResourceBuilder;
  withBuilderAsync: (builder: BuilderAsyncFunctionType) => IResourceBuilder;
  build: () => Promise<ResourceBuilderResults>;
}
