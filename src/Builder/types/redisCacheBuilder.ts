import { BuilderProps } from './genericBuilder';
import * as cache from '@pulumi/azure-native/cache';
import { NetworkPropsType } from '../../types';

export type RedisCacheBuilderArgs = BuilderProps;
export type RedisCacheSkuBuilder = {
  name: cache.SkuName | string;
  family: cache.SkuFamily | string;
  capacity: number;
};

export interface IRedisCacheSkuBuilder {
  withSku(props: RedisCacheSkuBuilder): IRedisCacheBuilder;
}

export interface IRedisCacheBuilder {
  withNetwork(props: NetworkPropsType): IRedisCacheBuilder;
}
