import { BuilderProps, IBuilder } from './genericBuilder';
import * as cache from '@pulumi/azure-native/redis';
import { NetworkPropsType, ResourceInfo } from '../../types';

/**
 * Arguments required for building a Redis Cache resource.
 */
export type RedisCacheBuilderArgs = BuilderProps;

/**
 * Arguments for defining the SKU of a Redis Cache.
 */
export type RedisCacheSkuBuilder = {
  /**
   * The name of the SKU.
   */
  name: cache.SkuName | string;
  /**
   * The family of the SKU.
   */
  family: cache.SkuFamily | string;
  /**
   * The capacity of the SKU.
   */
  capacity: number;
};

/**
 * Interface for building the SKU of a Redis Cache.
 */
export interface IRedisCacheSkuBuilder {
  /**
   * Sets the SKU properties for the Redis Cache.
   * @param props - The SKU properties.
   * @returns An instance of IRedisCacheBuilder.
   */
  withSku(props: RedisCacheSkuBuilder): IRedisCacheBuilder;
}

/**
 * Interface for building a Redis Cache.
 */
export interface IRedisCacheBuilder extends IBuilder<ResourceInfo> {
  /**
   * Sets the network properties for the Redis Cache.
   * @param props - The network properties.
   * @returns An instance of IRedisCacheBuilder.
   */
  withNetwork(props: NetworkPropsType): IRedisCacheBuilder;
  withNetworkIf(
    condition: boolean,
    props: NetworkPropsType,
  ): IRedisCacheBuilder;
}
