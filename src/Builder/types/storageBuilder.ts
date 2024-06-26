import { Input } from "@pulumi/pulumi";
import {
  ContainerProps,
  StorageFeatureType,
  StoragePolicyType,
} from "../../Storage";
import { DefaultManagementRules } from "../../Storage/ManagementRules";
import { ResourceInfo } from "../../types";
import { IBuilder } from "./genericBuilder";

export type StorageNetworkBuilderType = {
  subnetId?: Input<string>;
  ipAddresses?: Array<string>;
};
export type StorageFeatureBuilderType = Pick<
  StorageFeatureType,
  "enableKeyVaultEncryption" | "allowSharedKeyAccess"
>;
export interface IStorageStarterBuilder {
  asStorage(): IStorageBuilder;
  asStaticWebStorage(): IStaticWebStorageBuilder;
}

export interface IStorageSharedBuilder {
  withNetwork(props: StorageNetworkBuilderType): IStorageSharedBuilder;
  lock(): IStorageSharedBuilder;
}
export interface IStorageBuilder
  extends IBuilder<ResourceInfo>,
    IStorageSharedBuilder {
  withContainer(props: ContainerProps): IStorageBuilder;
  withQueue(name: string): IStorageBuilder;
  withFileShare(name: string): IStorageBuilder;
  withPolicies(props: StoragePolicyType): IStorageBuilder;
  withRule(props: DefaultManagementRules): IStorageBuilder;
  withFeature(props: StorageFeatureBuilderType): IStorageBuilder;
}

export interface IStaticWebStorageBuilder
  extends IBuilder<ResourceInfo>,
    IStorageSharedBuilder {
  withCustomDomain(domain: string): IStaticWebStorageBuilder;
  withCors(origins: string[]): IStaticWebStorageBuilder;
  withSecurityHeaders(props: Record<string, string>): IStaticWebStorageBuilder;
}
