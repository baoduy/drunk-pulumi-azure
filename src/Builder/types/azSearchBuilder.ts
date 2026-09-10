import { BuilderProps, IBuilder } from './genericBuilder';
import {
  NetworkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import * as search from '@pulumi/azure-native/search';
import { Input } from '@pulumi/pulumi';

export type AzSearchBuilderArgs = BuilderProps & WithEncryptionInfo;
/** Azure Search's networkRuleSet has no defaultAction member; restriction is expressed via publicNetworkAccess. */
export type AzSearchNetworkType = Omit<NetworkPropsType, 'defaultAction'> & {
  disableLocalAuth?: Input<boolean>;
};

export interface IAzSearchSkuBuilder {
  withSku(sku: search.SkuName): IAzSearchBuilder;
}

export interface IAzSearchBuilder extends IBuilder<ResourceInfo> {
  withNetwork(props: AzSearchNetworkType): IAzSearchBuilder;
}
