import * as ss from '@pulumi/azure-native/signalrservice';
import { BuilderProps, IBuilder } from './genericBuilder';
import {
  PrivateLinkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import * as pulumi from '@pulumi/pulumi';

/**
 * Arguments required for building a SignalR resource.
 */
export type SignalRBuilderArgs = BuilderProps & WithEncryptionInfo;

/**
 * Arguments for defining the SKU of a SignalR service.
 */
export type SignalRSkuBuilderType = {
  /**
   * The capacity of the SKU.
   */
  capacity?: 1 | 2 | 5 | 10 | 20 | 50 | 100;
  /**
   * The name of the SKU.
   */
  name: 'Standard_S1' | 'Free_F1';
  /**
   * The tier of the SKU.
   */
  tier?: 'Standard' | 'Free';
};

/**
 * Arguments for defining the kind of a SignalR service.
 */
export type SignalRKindBuilderType = ss.ServiceKind | string;

/**
 * Options for configuring a SignalR service.
 */
export type SignalROptionsBuilder = {
  /**
   * Whether client certificate authentication is enabled.
   */
  clientCertEnabled?: pulumi.Input<boolean>;
  /**
   * Enable or disable AAD authentication.
   * When set to true, connection with AuthType=aad won't work.
   */
  disableAadAuth?: pulumi.Input<boolean>;
  /**
   * Enable or disable local authentication with AccessKey.
   * When set to true, connection with AccessKey=xxx won't work.
   */
  disableLocalAuth?: pulumi.Input<boolean>;
  /**
   * Whether public network access is enabled.
   */
  publicNetworkAccess?: pulumi.Input<boolean>;
};

/**
 * Interface for building the kind of a SignalR service.
 */
export interface ISignalRKindBuilder {
  /**
   * Sets the kind properties for the SignalR service.
   * @param props - The kind properties.
   * @returns An instance of ISignalRSkuBuilder.
   */
  withKind(props: SignalRKindBuilderType): ISignalRSkuBuilder;
}

/**
 * Interface for building the SKU of a SignalR service.
 */
export interface ISignalRSkuBuilder {
  /**
   * Sets the SKU properties for the SignalR service.
   * @param props - The SKU properties.
   * @returns An instance of ISignalRBuilder.
   */
  withSku(props: SignalRSkuBuilderType): ISignalRBuilder;
}

/**
 * Interface for building a SignalR service.
 */
export interface ISignalRBuilder extends IBuilder<ResourceInfo> {
  /**
   * Sets the allowed origins for the SignalR service.
   * @param props - The allowed origins.
   * @returns An instance of ISignalRBuilder.
   */
  allowsOrigins(...props: pulumi.Input<string>[]): ISignalRBuilder;
  
  /**
   * Sets the private link properties for the SignalR service.
   * @param props - The private link properties.
   * @returns An instance of ISignalRBuilder.
   */
  withPrivateLink(props: PrivateLinkPropsType): ISignalRBuilder;
  
  /**
   * Sets additional options for the SignalR service.
   * @param props - The options properties.
   * @returns An instance of ISignalRBuilder.
   */
  withOptions(props: SignalROptionsBuilder): ISignalRBuilder;
  
  //withFeature(props: SignalRFeatureArgs): ISignalRBuilder;
}