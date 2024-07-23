import { EnvRolesResults } from '../../AzAd/EnvRoles';
import { RoleEnableTypes } from '../../AzAd/EnvRoles.Consts';
import { KeyVaultInfo, ResourceGroupInfo, ResourceInfo } from '../../types';
import { BuilderProps, IBuilder, IBuilderAsync } from './genericBuilder';
import { CertBuilderType } from './vaultBuilder';
import {
  IVnetBuilder,
  IVnetBuilderStart,
  VnetBuilderResults,
} from './vnetBuilder';
import { Input } from '@pulumi/pulumi';

export type ResourceBuilderResults = BuilderProps & {
  envRoles: EnvRolesResults;
  vnetInstance?: VnetBuilderResults;
  otherInstances: Record<string, any>;
};

export type BuilderFunctionType = (
  props: ResourceBuilderResults,
) => IBuilder<any>;
export type BuilderAsyncFunctionType = (
  props: ResourceBuilderResults,
) => IBuilderAsync<any>;
export type ResourceVnetBuilderType = (
  builder: IVnetBuilderStart,
) => IVnetBuilder;
export type ResourceFunction = (props: BuilderProps) => ResourceInfo;
export type ResourceVaultLinkingBuilderType = {
  subnetNames?: string[];
  ipAddresses?: Input<string>[];
  asPrivateLink?: boolean;
};

export interface IResourceRoleBuilder {
  createRoles(): IResourceGroupBuilder;
  withRoles(props: EnvRolesResults): IResourceGroupBuilder;
  withRolesFromVault(): IResourceGroupBuilder;
}

export interface IResourceGroupBuilder {
  createRG(props?: RoleEnableTypes): IResourceVaultBuilder;
  withRG(props: ResourceGroupInfo): IResourceVaultBuilder;
}

export interface IResourceVaultBuilder {
  createVault(name?: string): IResourceBuilder;
  withVault(props: KeyVaultInfo): IResourceBuilder;
  getVaultInfoBy(name: string): IResourceBuilder;
}

export interface IResourceVaultItemsBuilder {
  addSecrets(items: Record<string, Input<string>>): IResourceBuilder;
  //addKeys () : IResourceBuilder;
  addCerts(props: CertBuilderType): IResourceBuilder;
}

export interface IResourceVnetBuilder {
  withVnet(props: ResourceVnetBuilderType): IResourceBuilder;
  linkVaultTo(props: ResourceVaultLinkingBuilderType): IResourceBuilder;
}
export interface IResourceBuilder
  extends IResourceVnetBuilder,
    IResourceVaultItemsBuilder {
  withBuilder(props: BuilderFunctionType): IResourceBuilder;
  withBuilderAsync(props: BuilderAsyncFunctionType): IResourceBuilder;
  withResource(builder: ResourceFunction): IResourceBuilder;
  lock(): IResourceBuilder;
  build(): Promise<ResourceBuilderResults>;
}
