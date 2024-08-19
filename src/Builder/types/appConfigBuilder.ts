import { BuilderProps, IBuilder } from './genericBuilder';
import {
  PrivateLinkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import { Input } from '@pulumi/pulumi';
import { isPrd } from '../../Common';

export type AppConfigBuilderArgs = BuilderProps & WithEncryptionInfo;
export type AppConfigNetworkType = PrivateLinkPropsType & {
  disableLocalAuth?: Input<boolean>;
};
export type AppConfigOptionsBuilder = {
  enablePurgeProtection?: Input<boolean>;
  softDeleteRetentionInDays?: Input<number>;
};

export interface IAppConfigBuilder extends IBuilder<ResourceInfo> {
  withOptions(props: AppConfigOptionsBuilder): IAppConfigBuilder;
  withPrivateLink(props: AppConfigNetworkType): IAppConfigBuilder;
}
