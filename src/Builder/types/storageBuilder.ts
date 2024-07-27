import { CdnEndpointProps } from '../../Cdn/CdnEndpoint';
import { CdnSecurityHeaderTypes } from '../../Cdn/CdnRules';
import {
  ContainerProps,
  StorageFeatureType,
  StorageNetworkType,
  StoragePolicyType,
} from '../../Storage';
import { ResourceInfo } from '../../types';
import { IBuilder } from './genericBuilder';

export type StorageCdnType = Pick<
  CdnEndpointProps,
  'cdnProfileInfo' | 'cors' | 'domainNames'
> & { securityResponse?: CdnSecurityHeaderTypes };

export type StorageFeatureBuilderType = Pick<
  StorageFeatureType,
  'allowSharedKeyAccess'
>;
export interface IStorageStarterBuilder {
  asStorage(props?: StorageFeatureBuilderType): IStorageBuilder;
  asStaticWebStorage(): IStaticWebStorageBuilder;
}
export interface IStorageSharedBuilder extends IBuilder<ResourceInfo> {
  withNetwork(props: StorageNetworkType): IStorageSharedBuilder;
  lock(): IStorageSharedBuilder;
}
export interface IStorageBuilder
  extends IBuilder<ResourceInfo>,
    IStorageSharedBuilder {
  withContainer(props: ContainerProps): IStorageBuilder;
  withQueue(name: string): IStorageBuilder;
  withFileShare(name: string): IStorageBuilder;
  withPolicies(props: StoragePolicyType): IStorageBuilder;
}

export interface IStaticWebStorageBuilder
  extends IBuilder<ResourceInfo>,
    IStorageSharedBuilder {
  withCdn(props: StorageCdnType): IStaticWebStorageBuilder;
}
