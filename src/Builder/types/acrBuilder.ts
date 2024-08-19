import { BuilderProps, IBuilder } from './genericBuilder';
import {
  NetworkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import * as registry from '@pulumi/azure-native/containerregistry';

export type AcrBuilderArgs = BuilderProps & WithEncryptionInfo;
export type AcrSkuBuilderType = registry.SkuName | string;
export type AcrBuilderPolicies = { retentionDay: number };
export type AcrBuilderNetworkType = Omit<NetworkPropsType, 'subnetId'>;

export interface IAcrSkuBuilder {
  withSku(props: AcrSkuBuilderType): IAcrBuilder;
}
export interface IAcrBuilder extends IBuilder<ResourceInfo> {
  /**This only available for premium sku*/
  withNetwork(props: AcrBuilderNetworkType): IAcrBuilder;
  /**This only available for premium sku*/
  withPolicy(props: AcrBuilderPolicies): IAcrBuilder;
}
