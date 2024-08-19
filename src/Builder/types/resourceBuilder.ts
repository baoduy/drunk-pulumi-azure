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

/**
 * Type for the results of the resource builder.
 */
export type ResourceBuilderResults = BuilderProps &
  WithEncryptionInfo &
  WithLogInfo & {
    vnetInstance?: VnetBuilderResults;
    otherInstances: Record<string, any>;
  };

/**
 * Type for a synchronous builder function.
 */
export type BuilderFunctionType = (
  /**
   * The properties of the resource builder results.
   */
  props: ResourceBuilderResults,
) => IBuilder<any>;

/**
 * Type for an asynchronous builder function.
 */
export type BuilderAsyncFunctionType = (
  /**
   * The properties of the resource builder results.
   */
  props: ResourceBuilderResults,
) => IBuilderAsync<any>;

/**
 * Type for a VNet builder function.
 */
export type ResourceVnetBuilderType = (
  /**
   * The starting point for the VNet builder.
   */
  builder: IVnetBuilderStart,
) => IVnetBuilder;

/**
 * Type for a resource function.
 */
export type ResourceFunction = (
  /**
   * The properties of the builder.
   */
  props: BuilderProps,
) => ResourceInfo;

/**
 * Type for linking a resource vault.
 */
export type ResourceVaultLinkingBuilderType = {
  /**
   * List of subnet names to link to the resource vault.
   */
  subnetNames?: string[];
  /**
   * List of IP addresses to link to the resource vault.
   */
  ipAddresses?: Input<string>[];
  /**
   * Whether to link the resource vault as a private link.
   */
  asPrivateLink?: boolean;
};

/**
 * Interface for building resource roles.
 */
export interface IResourceRoleBuilder {
  /**
   * Creates roles for the resource.
   * @returns An instance of IResourceGroupBuilder.
   */
  createRoles(): IResourceGroupBuilder;
  
  /**
   * Sets the roles properties for the resource.
   * @param props - The roles properties.
   * @returns An instance of IResourceGroupBuilder.
   */
  withRoles(props: EnvRolesInfo): IResourceGroupBuilder;
  
  /**
   * Sets the roles properties from the vault.
   * @returns An instance of IResourceGroupBuilder.
   */
  withRolesFromVault(): IResourceGroupBuilder;
}

/**
 * Interface for building resource groups.
 */
export interface IResourceGroupBuilder {
  /**
   * Creates a resource group.
   * @param props - The role enable types.
   * @returns An instance of IResourceVaultBuilder.
   */
  createRG(props?: RoleEnableTypes): IResourceVaultBuilder;
  
  /**
   * Sets the resource group properties.
   * @param props - The resource group properties.
   * @returns An instance of IResourceVaultBuilder.
   */
  withRG(props: ResourceGroupInfo): IResourceVaultBuilder;
}

/**
 * Interface for building resource vaults.
 * Key Vault is compulsory for resource builder.
 */
export interface IResourceVaultBuilder {
  /**
   * Creates a vault for the resource.
   * @param name - The name of the vault.
   * @returns An instance of IResourceBuilder.
   */
  createVault(name?: string): IResourceBuilder;
  
  /**
   * Sets the vault properties.
   * @param props - The vault properties.
   * @returns An instance of IResourceBuilder.
   */
  withVault(props: KeyVaultInfo): IResourceBuilder;
  
  /**
   * Sets the vault properties from the given name.
   * @param name - The name of the vault.
   * @returns An instance of IResourceBuilder.
   */
  withVaultFrom(name: string): IResourceBuilder;
}

/**
 * Interface for building resource vault items.
 */
export interface IResourceVaultItemsBuilder {
  /**
   * Adds secrets to the resource vault.
   * @param items - The secrets to add.
   * @returns An instance of IResourceBuilder.
   */
  addSecrets(items: VaultBuilderSecretType): IResourceBuilder;
  
  //addKeys () : IResourceBuilder;
  
  /**
   * Adds certificates to the resource vault.
   * @param props - The certificate properties.
   * @returns An instance of IResourceBuilder.
   */
  addCerts(props: CertBuilderType): IResourceBuilder;
}

/**
 * Interface for building environment user-assigned identities.
 */
export interface IEnvUserAssignedIdentityBuilder {
  /**
   * Creates a User Assigned Identity for encryption purposes.
   * @returns An instance of IResourceBuilder.
   */
  createEnvUID(): IResourceBuilder;
  
  /**
   * Sets the User Assigned Identity properties from the vault.
   * @returns An instance of IResourceBuilder.
   */
  withEnvUIDFromVault(): IResourceBuilder;
}

/**
 * Interface for building resource VNets.
 */
export interface IResourceVnetBuilder {
  /**
   * Sets the VNet properties for the resource.
   * @param props - The VNet builder properties.
   * @returns An instance of IResourceBuilder.
   */
  withVnet(props: ResourceVnetBuilderType): IResourceBuilder;
  
  /**
   * Links the resource vault to the specified properties.
   * @param props - The vault linking properties.
   * @returns An instance of IResourceBuilder.
   */
  linkVaultTo(props: ResourceVaultLinkingBuilderType): IResourceBuilder;
}

/**
 * Interface for building resources.
 */
export interface IResourceBuilder
  extends IResourceVnetBuilder,
    IEnvUserAssignedIdentityBuilder,
    IResourceVaultItemsBuilder,
    ILockable<IResourceBuilder>,
    IEncryptable<IResourceBuilder> {
  /**
   * Sets the log properties from the given name.
   * @param name - The name of the log.
   * @returns An instance of IResourceBuilder.
   */
  withLogFrom(name: string): IResourceBuilder;
  
  /**
   * Sets the builder properties.
   * @param props - The builder function properties.
   * @returns An instance of IResourceBuilder.
   */
  withBuilder(props: BuilderFunctionType): IResourceBuilder;
  
  /**
   * Conditionally sets the builder properties.
   * @param condition - The condition to check.
   * @param props - The builder function properties.
   * @returns An instance of IResourceBuilder.
   */
  withBuilderIf(
    condition: boolean,
    props: BuilderFunctionType,
  ): IResourceBuilder;
  
  /**
   * Sets the asynchronous builder properties.
   * @param props - The asynchronous builder function properties.
   * @returns An instance of IResourceBuilder.
   */
  withBuilderAsync(props: BuilderAsyncFunctionType): IResourceBuilder;
  
  /**
   * Conditionally sets the asynchronous builder properties.
   * @param condition - The condition to check.
   * @param props - The asynchronous builder function properties.
   * @returns An instance of IResourceBuilder.
   */
  withBuilderAsyncIf(
    condition: boolean,
    props: BuilderAsyncFunctionType,
  ): IResourceBuilder;
  
  /**
   * Sets the resource properties.
   * @param builder - The resource function.
   * @returns An instance of IResourceBuilder.
   */
  withResource(builder: ResourceFunction): IResourceBuilder;
  
  /**
   * Builds the resource and returns the resource builder results.
   * @returns A promise that resolves to the resource builder results.
   */
  build(): Promise<ResourceBuilderResults>;
}