import { BuilderProps, IBuilder } from './genericBuilder';
import {
  NetworkPropsType,
  ResourceInfo,
  WithEncryption,
  WithEnvRoles,
} from '../../types';
import * as bus from '@pulumi/azure-native/servicebus';

export type ServiceBusBuilderArgs = BuilderProps &
  WithEnvRoles &
  WithEncryption;

export type ServiceBusSkuTypes = bus.SkuName | string;

export type ServiceBusQueueArgs = Omit<
  bus.QueueArgs,
  'namespaceName' | 'queueName' | 'resourceGroupName' | 'status'
>;

export type ServiceBusSubArgs = Omit<
  bus.SubscriptionArgs,
  | 'namespaceName'
  | 'topicName'
  | 'resourceGroupName'
  | 'status'
  | 'subscriptionName'
> & {};

export type ServiceBusTopicArgs = Omit<
  bus.TopicArgs,
  'namespaceName' | 'topicName' | 'resourceGroupName' | 'status'
> & { subscriptions?: Record<string, ServiceBusSubArgs> };

export type ServiceBusOptions = Pick<bus.NamespaceArgs, 'disableLocalAuth'>;

export interface IServiceBusSkuBuilder {
  withSku(sku: ServiceBusSkuTypes): IServiceBusBuilder;
}

export interface IServiceBusBuilder extends IBuilder<ResourceInfo> {
  //enableGlobalConnection(enabled?: boolean): IServiceBusBuilder;
  withNetwork(props: NetworkPropsType): IServiceBusBuilder;
  withNetworkIf(
    condition: boolean,
    props: NetworkPropsType,
  ): IServiceBusBuilder;
  withOptions(props: ServiceBusOptions): IServiceBusBuilder;
  withQueues(props: Record<string, ServiceBusQueueArgs>): IServiceBusBuilder;
  withTopics(props: Record<string, ServiceBusTopicArgs>): IServiceBusBuilder;
}
