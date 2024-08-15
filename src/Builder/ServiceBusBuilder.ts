import {
  IServiceBusBuilder,
  IServiceBusSkuBuilder,
  ServiceBusBuilderArgs,
} from './types/serviceBusBuilder';
import { Builder } from './types';
import { ResourceInfo } from '../types';

class ServiceBusBuilder
  extends Builder<ResourceInfo>
  implements IServiceBusBuilder, IServiceBusSkuBuilder
{
  constructor(private args: ServiceBusBuilderArgs) {
    super(args);
  }
}
