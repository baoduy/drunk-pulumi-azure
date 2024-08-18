import { BuilderProps, IBuilder } from './genericBuilder';
import {
  PrivateLinkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import { Input } from '@pulumi/pulumi';

export type AppConfigBuilderArgs = BuilderProps & WithEncryptionInfo;
export type AppConfigNetworkType = PrivateLinkPropsType & {
  disableLocalAuth?: Input<boolean>;
};

export interface IAppConfigBuilder extends IBuilder<ResourceInfo> {
  withPrivateLink(props: AppConfigNetworkType): IAppConfigBuilder;
}
