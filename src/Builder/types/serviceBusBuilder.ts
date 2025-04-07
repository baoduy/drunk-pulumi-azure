import { BuilderProps, IBuilder } from './genericBuilder';
import {
  NetworkPropsType,
  ResourceInfo,
  WithEncryption,
  WithEnvRoles,
} from '../../types';
import * as bus from '@pulumi/azure-native/servicebus';

/**
 * Arguments required for building a Service Bus resource.
 */
export type ServiceBusBuilderArgs = BuilderProps &
  WithEnvRoles &
  WithEncryption;

/**
 * Types of SKU available for Service Bus.
 */
export type ServiceBusSkuTypes = bus.SkuTier;

/**
 * Arguments for defining a Service Bus Queue.
 */
export type ServiceBusQueueArgs = Omit<
  bus.QueueArgs,
  'namespaceName' | 'queueName' | 'resourceGroupName' | 'status'
>;

/**
 * Arguments for defining a Service Bus Subscription.
 */
export type ServiceBusSubArgs = Omit<
  bus.SubscriptionArgs,
  | 'namespaceName'
  | 'topicName'
  | 'resourceGroupName'
  | 'status'
  | 'subscriptionName'
> & {
  rules?: Omit<
    bus.RuleArgs,
    | 'namespaceName'
    | 'subscriptionName'
    | 'topicName'
    | 'ruleName'
    | 'resourceGroupName'
  >;
};

/**
 * Arguments for defining a Service Bus Topic.
 */
export type ServiceBusTopicArgs = Omit<
  bus.TopicArgs,
  'namespaceName' | 'topicName' | 'resourceGroupName' | 'status'
> & { subscriptions?: Record<string, ServiceBusSubArgs> };

/**
 * Options for configuring a Service Bus Namespace.
 */
export type ServiceBusOptions = Pick<bus.NamespaceArgs, 'disableLocalAuth'>;

/**
 * Interface for building the SKU of a Service Bus.
 */
export interface IServiceBusSkuBuilder {
  /**
   * Sets the SKU properties for the Service Bus.
   * @param sku - The SKU type.
   * @returns An instance of IServiceBusBuilder.
   */
  withSku(sku: ServiceBusSkuTypes): IServiceBusBuilder;
}

/**
 * Interface for building a Service Bus.
 */
export interface IServiceBusBuilder extends IBuilder<ResourceInfo> {
  /**
   * Sets the network properties for the Service Bus.
   * @param props - The network properties.
   * @returns An instance of IServiceBusBuilder.
   */
  withNetwork(props: NetworkPropsType): IServiceBusBuilder;
  
  /**
   * Conditionally sets the network properties for the Service Bus.
   * @param condition - The condition to check.
   * @param props - The network properties.
   * @returns An instance of IServiceBusBuilder.
   */
  withNetworkIf(
    condition: boolean,
    props: NetworkPropsType,
  ): IServiceBusBuilder;
  
  /**
   * Sets additional options for the Service Bus.
   * @param props - The options properties.
   * @returns An instance of IServiceBusBuilder.
   */
  withOptions(props: ServiceBusOptions): IServiceBusBuilder;
  
  /**
   * Adds queues to the Service Bus.
   * @param props - The properties of the queues.
   * @returns An instance of IServiceBusBuilder.
   */
  withQueues(props: Record<string, ServiceBusQueueArgs>): IServiceBusBuilder;
  
  /**
   * Adds topics to the Service Bus.
   * @param props - The properties of the topics.
   * @returns An instance of IServiceBusBuilder.
   */
  withTopics(props: Record<string, ServiceBusTopicArgs>): IServiceBusBuilder;
}