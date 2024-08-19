import { EnvRolesInfo } from '../../AzAd/EnvRoles';
import { RoleEnableTypes } from '../../AzAd/EnvRoles.Consts';
import {
  KeyVaultInfo,
  ResourceGroupInfo,
  ResourceInfo,
  WithEncryptionInfo,
  WithLogInfo,
} from '../../types';
import {
  BuilderProps,
  IBuilder,
  IBuilderAsync,
  IEncryptable,
  ILockable,
} from './genericBuilder';
import { CertBuilderType, VaultBuilderSecretType } from './vaultBuilder';
import {
  IVnetBuilder,
  IVnetBuilderStart,
  VnetBuilderResults,
} from './vnetBuilder';
import { Input } from '@pulumi/pulumi';

export type ResourceBuilderResults = BuilderProps &
  WithEncryptionInfo &
  WithLogInfo & {
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
  withRoles(props: EnvRolesInfo): IResourceGroupBuilder;
  withRolesFromVault(): IResourceGroupBuilder;
}

export interface IResourceGroupBuilder {
  createRG(props?: RoleEnableTypes): IResourceVaultBuilder;
  withRG(props: ResourceGroupInfo): IResourceVaultBuilder;
}

/** Key Vault is compulsory for resource builder*/
export interface IResourceVaultBuilder {
  createVault(name?: string): IResourceBuilder;
  withVault(props: KeyVaultInfo): IResourceBuilder;
  withVaultFrom(name: string): IResourceBuilder;
}

export interface IResourceVaultItemsBuilder {
  addSecrets(items: VaultBuilderSecretType): IResourceBuilder;
  //addKeys () : IResourceBuilder;
  addCerts(props: CertBuilderType): IResourceBuilder;
}
export interface IEnvUserAssignedIdentityBuilder {
  /** Create User Assigned Identity for encryption purposes*/
  createEnvUID(): IResourceBuilder;
  /** Create User Assigned Identity for encryption purposes*/
  withEnvUIDFromVault(): IResourceBuilder;
}
export interface IResourceVnetBuilder {
  withVnet(props: ResourceVnetBuilderType): IResourceBuilder;
  linkVaultTo(props: ResourceVaultLinkingBuilderType): IResourceBuilder;
}
export interface IResourceBuilder
  extends IResourceVnetBuilder,
    IEnvUserAssignedIdentityBuilder,
    IResourceVaultItemsBuilder,
    ILockable<IResourceBuilder>,
    IEncryptable<IResourceBuilder> {
  withLogFrom(name: string): IResourceBuilder;
  withBuilder(props: BuilderFunctionType): IResourceBuilder;
  withBuilderIf(
    condition: boolean,
    props: BuilderFunctionType,
  ): IResourceBuilder;
  withBuilderAsync(props: BuilderAsyncFunctionType): IResourceBuilder;
  withBuilderAsyncIf(
    condition: boolean,
    props: BuilderAsyncFunctionType,
  ): IResourceBuilder;
  withResource(builder: ResourceFunction): IResourceBuilder;
  build(): Promise<ResourceBuilderResults>;
}
