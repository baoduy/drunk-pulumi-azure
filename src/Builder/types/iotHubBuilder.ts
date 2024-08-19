import { BuilderProps, IBuilder } from './genericBuilder';
import { ResourceInfo, WithEncryptionInfo } from '../../types';
import * as devices from '@pulumi/azure-native/devices';
import { Input } from '@pulumi/pulumi';

/**
 * Arguments for the IoT Hub Builder.
 */
export type IotHubBuilderArgs = BuilderProps & WithEncryptionInfo;

/**
 * Properties for configuring the SKU of an IoT Hub.
 */
export type IotHubSkuBuilderType = {
  name: devices.IotHubSku;
  capacity?: number;
};

/**
 * Properties for configuring the service bus settings of an IoT Hub.
 */
export type IotHubBusBuilderType = {
  /** Provide the queue connection string to enable messages to be pushed to the service bus queue */
  queueMessageConnectionString?: Input<string>;
  /** Provide the topic connection string to enable messages to be pushed to the service bus topic */
  topicMessageConnectionString?: Input<string>;
};

/**
 * Properties for configuring the storage settings of an IoT Hub.
 */
export type IotHubStorageBuilderType = {
  connectionString: Input<string>;
  /** Provide the file container name to enable files to be uploaded in IoT Hub */
  fileContainerName?: Input<string>;
  /** Provide the message container name to enable messages to be pushed to storage */
  messageContainerName?: Input<string>;
  /** Provide the event container name to enable events to be pushed to storage */
  eventContainerName?: Input<string>;
};

/**
 * Interface for building the SKU of an IoT Hub.
 */
export interface IIotHubSkuBuilder {
  /**
   * Method to set the SKU for the IoT Hub.
   * @param props - Properties for the IoT Hub SKU.
   * @returns An instance of IIotHubBuilder.
   */
  withSku(props: IotHubSkuBuilderType): IIotHubBuilder;
}

/**
 * Interface for building an IoT Hub.
 */
export interface IIotHubBuilder extends IBuilder<ResourceInfo> {
  /**
   * Method to set the service bus properties for the IoT Hub.
   * @param props - Properties for the service bus.
   * @returns An instance of IIotHubBuilder.
   */
  withBus(props: IotHubBusBuilderType): IIotHubBuilder;

  /**
   * Method to set the storage properties for the IoT Hub.
   * @param props - Properties for the storage.
   * @returns An instance of IIotHubBuilder.
   */
  withStorage(props: IotHubStorageBuilderType): IIotHubBuilder;
}
