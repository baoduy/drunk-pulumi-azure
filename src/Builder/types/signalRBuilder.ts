import * as ss from '@pulumi/azure-native/signalrservice';
import { BuilderProps, IBuilder } from './genericBuilder';
import {
  PrivateLinkPropsType,
  ResourceInfo,
  WithEncryptionInfo,
} from '../../types';
import * as pulumi from '@pulumi/pulumi';

export type SignalRBuilderArgs = BuilderProps & WithEncryptionInfo;
export type SignalRSkuBuilderType = {
  capacity?: 1 | 2 | 5 | 10 | 20 | 50 | 100;
  name: 'Standard_S1' | 'Free_F1';
  tier?: 'Standard' | 'Free';
};
export type SignalRKindBuilderType = ss.ServiceKind | string;
export type SignalROptionsBuilder = {
  clientCertEnabled?: pulumi.Input<boolean>;
  /**
   * DisableLocalAuth
   * Enable or disable aad auth
   * When set as true, connection with AuthType=aad won't work.
   */
  disableAadAuth?: pulumi.Input<boolean>;
  /**
   * DisableLocalAuth
   * Enable or disable local auth with AccessKey
   * When set as true, connection with AccessKey=xxx won't work.
   */
  disableLocalAuth?: pulumi.Input<boolean>;
  publicNetworkAccess?: pulumi.Input<boolean>;
};
// export type SignalRFeatureArgs = {
//   /**
//    * FeatureFlags is the supported features of Azure SignalR service.
//    * - ServiceMode: Flag for backend server for SignalR service. Values allowed: "Default": have your own backend server; "Serverless": your application doesn't have a backend server; "Classic": for backward compatibility. Support both Default and Serverless mode but not recommended; "PredefinedOnly": for future use.
//    * - EnableConnectivityLogs: "true"/"false", to enable/disable the connectivity log category respectively.
//    * - EnableMessagingLogs: "true"/"false", to enable/disable the connectivity log category respectively.
//    * - EnableLiveTrace: Live Trace allows you to know what's happening inside Azure SignalR service, it will give you live traces in real time, it will be helpful when you developing your own Azure SignalR based web application or self-troubleshooting some issues. Please note that live traces are counted as outbound messages that will be charged. Values allowed: "true"/"false", to enable/disable live trace feature.
//    */
//   flag: pulumi.Input<string | ss.v20230301preview.FeatureFlags>;
//   /**
//    * Optional properties related to this feature.
//    */
//   properties?: pulumi.Input<{
//     [key: string]: pulumi.Input<string>;
//   }>;
//   /**
//    * Value of the feature flag. See Azure SignalR service document https://docs.microsoft.com/azure/azure-signalr/ for allowed values.
//    */
//   value: pulumi.Input<string>;
// };

export interface ISignalRKindBuilder {
  withKind(props: SignalRKindBuilderType): ISignalRSkuBuilder;
}
export interface ISignalRSkuBuilder {
  withSku(props: SignalRSkuBuilderType): ISignalRBuilder;
}
export interface ISignalRBuilder extends IBuilder<ResourceInfo> {
  allowsOrigins(...props: pulumi.Input<string>[]): ISignalRBuilder;
  withPrivateLink(props: PrivateLinkPropsType): ISignalRBuilder;
  withOptions(props: SignalROptionsBuilder): ISignalRBuilder;
  //withFeature(props: SignalRFeatureArgs): ISignalRBuilder;
}
