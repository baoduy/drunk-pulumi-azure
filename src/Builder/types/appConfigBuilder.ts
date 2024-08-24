import { BuilderProps, IBuilder } from './genericBuilder';
import {
  PrivateLinkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import { Input } from '@pulumi/pulumi';
import { isPrd } from '../../Common';

/**
 * Arguments for the App Configuration Builder.
 */
export type AppConfigBuilderArgs = BuilderProps & WithEncryptionInfo;

/**
 * Properties for configuring the network settings of an App Configuration.
 */
export type AppConfigNetworkType = PrivateLinkPropsType & {
  disableLocalAuth?: Input<boolean>;
  allowsPublicAccess?: boolean;
};

/**
 * Properties for configuring options of an App Configuration.
 */
export type AppConfigOptionsBuilder = {
  enablePurgeProtection?: Input<boolean>;
  softDeleteRetentionInDays?: Input<number>;
};

/**
 * Interface for building an App Configuration.
 */
export interface IAppConfigBuilder extends IBuilder<ResourceInfo> {
  /**
   * Method to set options for the App Configuration.
   * @param props - Properties for configuring options.
   * @returns An instance of IAppConfigBuilder.
   */
  withOptions(props: AppConfigOptionsBuilder): IAppConfigBuilder;

  /**
   * Method to set private link properties for the App Configuration.
   * @param props - Properties for configuring the network settings.
   * @returns An instance of IAppConfigBuilder.
   */
  withPrivateLink(props: AppConfigNetworkType): IAppConfigBuilder;
}
