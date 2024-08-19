import { BuilderProps, IBuilder } from './genericBuilder';
import * as cache from '@pulumi/azure-native/cache';
import { NetworkPropsType, ResourceInfo } from '../../types';

export type RedisCacheBuilderArgs = BuilderProps;
export type RedisCacheSkuBuilder = {
  name: cache.SkuName | string;
  family: cache.SkuFamily | string;
  capacity: number;
};

export interface IRedisCacheSkuBuilder {
  withSku(props: RedisCacheSkuBuilder): IRedisCacheBuilder;
}

export interface IRedisCacheBuilder extends IBuilder<ResourceInfo> {
  withNetwork(props: NetworkPropsType): IRedisCacheBuilder;
}
