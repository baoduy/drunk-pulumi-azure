import {
  IServiceBusBuilder,
  IServiceBusSkuBuilder,
  ServiceBusBuilderArgs,
  ServiceBusQueueArgs,
  ServiceBusSkuTypes,
  ServiceBusTopicArgs,
} from './types/serviceBusBuilder';
import { Builder } from './types';
import { NetworkPropsType, ResourceInfo } from '../types';
import is from '@sindresorhus/is';
import undefined = is.undefined;
import {getServiceBusName} from "../Common";

class ServiceBusBuilder
  extends Builder<ResourceInfo>
  implements IServiceBusBuilder, IServiceBusSkuBuilder
{
  private readonly _instanceName: string;

  private _sku: ServiceBusSkuTypes = 'Basic';
  private _network: NetworkPropsType | undefined = undefined;
  private _queues: Record<string, ServiceBusQueueArgs> = {};
  private _topics: Record<string, ServiceBusTopicArgs> = {};


  constructor(private args: ServiceBusBuilderArgs) {
    this._instanceName = getServiceBusName(args.name);
    super(args);
  }

  public withSku(sku: ServiceBusSkuTypes): IServiceBusBuilder {
    this._sku = sku;
    return this;
  }

  public withNetwork(props: NetworkPropsType): IServiceBusBuilder {
    if (this._sku !== 'Premium')
      throw new Error(
        "The network only support for Service Bus with 'Premium' tier.",
      );

    this._network = props;
    return this;
  }

  public withQueues(
    props: Record<string, ServiceBusQueueArgs>,
  ): IServiceBusBuilder {
    this._queues = { ...this._queues, ...props };
    return this;
  }

  public withTopics(
    props: Record<string, ServiceBusTopicArgs>,
  ): IServiceBusBuilder {
    this._topics = { ...this._topics, ...props };
    return this;
  }

  private buildNamespace() {
    this._sbInstance = new 
  }

  private buildNetwork() {}

  private buildQueues() {}

  private buildTopics() {}

  public build(): ResourceInfo {
    this.buildNamespace();
    this.buildNetwork();
    this.buildQueues();
    this.buildTopics();

    return undefined;
  }
}
