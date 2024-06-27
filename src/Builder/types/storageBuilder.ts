import { Input } from "@pulumi/pulumi";
import {
  ContainerProps,
  StorageFeatureType,
  StorageNetworkType,
  StoragePolicyType,
} from "../../Storage";
import { CdnEndpointProps } from "../../Storage/CdnEndpoint";
import { ResourceInfo } from "../../types";
import { IBuilder } from "./genericBuilder";

export type StorageCdnType = Omit<
  CdnEndpointProps,
  "name" | "dependsOn" | "ignoreChanges" | "importUri" | "origin"
>;

export type StorageFeatureBuilderType = Pick<
  StorageFeatureType,
  "enableKeyVaultEncryption" | "allowSharedKeyAccess"
>;
export interface IStorageStarterBuilder {
  asStorage(): IStorageBuilder;
  asStaticWebStorage(): IStaticWebStorageBuilder;
}

export interface IStorageSharedBuilder {
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
  withFeature(props: StorageFeatureBuilderType): IStorageBuilder;
}

export interface IStaticWebStorageBuilder
  extends IBuilder<ResourceInfo>,
    IStorageSharedBuilder {
  withCdn(props: StorageCdnType): IStaticWebStorageBuilder;
}
