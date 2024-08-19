import { BuilderProps, IBuilder } from './genericBuilder';
import {
  NetworkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import * as registry from '@pulumi/azure-native/containerregistry';

/**
 * Arguments for the ACR Builder, extending BuilderProps with encryption information.
 */
export type AcrBuilderArgs = BuilderProps & WithEncryptionInfo;

/**
 * Type for ACR SKU, can be either a predefined SkuName from the registry or a custom string.
 */
export type AcrSkuBuilderType = registry.SkuName | string;

/**
 * Policies for ACR, currently only including retention day.
 */
export type AcrBuilderPolicies = { retentionDay: number };

/**
 * Network properties for ACR, excluding subnetId from NetworkPropsType.
 */
export type AcrBuilderNetworkType = Omit<NetworkPropsType, 'subnetId'>;

/**
 * Interface for building Azure Container Registry (ACR) resources.
 * This interface extends the generic IBuilder interface with ACR-specific methods.
 * It provides a fluent API for configuring ACR properties such as SKU, network settings, and policies.
 */
export interface IAcrSkuBuilder {
  /**
   * Sets the SKU for the ACR.
   * @param props The SKU to set for the ACR.
   * @returns An instance of IAcrBuilder for further configuration.
   */
  withSku(props: AcrSkuBuilderType): IAcrBuilder;
}

/**
 * Interface for configuring ACR-specific properties.
 * Extends the generic IBuilder interface with ResourceInfo as the build result type.
 */
export interface IAcrBuilder extends IBuilder<ResourceInfo> {
  /**
   * Sets the network configuration for the ACR.
   * This is only available for premium SKU.
   * @param props The network properties to set.
   * @returns The current IAcrBuilder instance for method chaining.
   */
  withNetwork(props: AcrBuilderNetworkType): IAcrBuilder;

  /**
   * Sets the policies for the ACR.
   * This is only available for premium SKU.
   * @param props The policies to set, including retention day.
   * @returns The current IAcrBuilder instance for method chaining.
   */
  withPolicy(props: AcrBuilderPolicies): IAcrBuilder;
}