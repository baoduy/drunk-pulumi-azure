import { CdnEndpointProps } from '../../Cdn/CdnEndpoint';
import { CdnSecurityHeaderTypes } from '../../Cdn/CdnRules';
import {
  ContainerProps,
  StorageFeatureType,
  StorageNetworkType,
  StoragePolicyType,
} from '../../Storage';
import { ResourceInfo, WithEncryptionInfo } from '../../types';
import { BuilderProps, IBuilder, ILockable } from './genericBuilder';

/**
 * Arguments required for building a Storage resource.
 */
export type StorageBuilderArgs = BuilderProps & WithEncryptionInfo;

/**
 * Type for defining CDN properties for a Storage resource.
 */
export type StorageCdnType = Pick<
  CdnEndpointProps,
  'cdnProfileInfo' | 'cors' | 'domainNames'
> & {
  /**
   * Security response headers for the CDN.
   */
  securityResponse?: CdnSecurityHeaderTypes;
};

/**
 * Type for defining storage features, excluding static website enablement.
 */
export type StorageFeatureBuilderType = Omit<
  StorageFeatureType,
  'enableStaticWebsite'
>;

/**
 * Interface for starting the building of a Storage resource.
 */
export interface IStorageStarterBuilder {
  /**
   * Initializes the builder as a standard storage resource.
   * @param props - The storage feature properties.
   * @returns An instance of IStorageBuilder.
   */
  asStorage(props?: StorageFeatureBuilderType): IStorageBuilder;

  /**
   * Initializes the builder as a static web storage resource.
   * @returns An instance of IStaticWebStorageBuilder.
   */
  asStaticWebStorage(): IStaticWebStorageBuilder;
}

/**
 * Interface for shared storage builder methods.
 */
export interface IStorageSharedBuilder
  extends IBuilder<ResourceInfo>,
    ILockable<IStorageSharedBuilder> {
  /**
   * Sets the network properties for the storage resource.
   * @param props - The network properties.
   * @returns An instance of IStorageSharedBuilder.
   */
  withNetwork(props: StorageNetworkType): IStorageSharedBuilder;
  withNetworkIf(
    condition: boolean,
    props: StorageNetworkType,
  ): IStorageSharedBuilder;
}

/**
 * Interface for building a standard Storage resource.
 */
export interface IStorageBuilder
  extends IBuilder<ResourceInfo>,
    IStorageSharedBuilder {
  /**
   * Adds a container to the storage resource.
   * @param props - The container properties.
   * @returns An instance of IStorageBuilder.
   */
  withContainer(props: ContainerProps): IStorageBuilder;
  withContainerIf(condition: boolean, props: ContainerProps): IStorageBuilder;

  /**
   * Adds a queue to the storage resource.
   * @param name - The name of the queue.
   * @returns An instance of IStorageBuilder.
   */
  withQueue(name: string): IStorageBuilder;
  withQueueIf(condition: boolean, name: string): IStorageBuilder;

  /**
   * Adds a file share to the storage resource.
   * @param name - The name of the file share.
   * @returns An instance of IStorageBuilder.
   */
  withFileShare(name: string): IStorageBuilder;
  withFileShareIf(condition: boolean, name: string): IStorageBuilder;

  /**
   * Sets the policies for the storage resource.
   * @param props - The policy properties.
   * @returns An instance of IStorageBuilder.
   */
  withPolicies(props: StoragePolicyType): IStorageBuilder;
  withPoliciesIf(condition: boolean, props: StoragePolicyType): IStorageBuilder;
}

/**
 * Interface for building a static web Storage resource.
 */
export interface IStaticWebStorageBuilder
  extends IBuilder<ResourceInfo>,
    IStorageSharedBuilder {
  /**
   * Sets the CDN properties for the static web storage resource.
   * @param props - The CDN properties.
   * @returns An instance of IStaticWebStorageBuilder.
   */
  withCdn(props: StorageCdnType): IStaticWebStorageBuilder;

  withCdnIf(
    condition: boolean,
    props: StorageCdnType,
  ): IStaticWebStorageBuilder;
}
