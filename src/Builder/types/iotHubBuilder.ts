import { BuilderProps, IBuilder } from './genericBuilder';
import { ResourceInfo, WithEncryptionInfo } from '../../types';
import * as devices from '@pulumi/azure-native/devices';
import { Input } from '@pulumi/pulumi';

export type IotHubBuilderArgs = BuilderProps & WithEncryptionInfo;
export type IotHubSkuBuilderType = {
  name: devices.IotHubSku;
  capacity?: number;
};
export type IotHubBusBuilderType = {
  /** provide the queue connection string to enable message to be pushing to service bus queue */
  queueMessageConnectionString?: Input<string>;
  /** provide the topic connection string to enable message to be pushing to service bus topic */
  topicMessageConnectionString?: Input<string>;
};
export type IotHubStorageBuilderType = {
  connectionString: Input<string>;
  /** provide the file container name to enable file to be upload in IOT hub*/
  fileContainerName?: Input<string>;
  /** provide the message container name to enable message to be pushing to storage */
  messageContainerName?: Input<string>;
  /** provide the event container name to enable events to be pushing to storage */
  eventContainerName?: Input<string>;
};
export interface IIotHubSkuBuilder {
  withSku(props: IotHubSkuBuilderType): IIotHubBuilder;
}
export interface IIotHubBuilder extends IBuilder<ResourceInfo> {
  withBus(props: IotHubBusBuilderType): IIotHubBuilder;
  withStorage(props: IotHubStorageBuilderType): IIotHubBuilder;
}
