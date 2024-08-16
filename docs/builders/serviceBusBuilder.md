Sure! Here is a simplified and more developer-friendly technical documentation for the `serviceBusBuilder.ts` and `ServiceBusBuilder.ts` files.

## `serviceBusBuilder.ts`

### Overview
This file defines the types and interfaces used to configure and build an Azure Service Bus using Pulumi.

### Key Types and Interfaces

- **ServiceBusBuilderArgs**: Combines properties from `BuilderProps`, `WithEnvRoles`, and `WithEncryption`.
- **ServiceBusSkuTypes**: Represents the SKU tier for the Service Bus.
- **ServiceBusQueueArgs**: Configuration for Service Bus queues, excluding some properties.
- **ServiceBusSubArgs**: Configuration for Service Bus subscriptions, excluding some properties.
- **ServiceBusTopicArgs**: Configuration for Service Bus topics, with optional subscriptions.
- **ServiceBusOptions**: Additional options for the Service Bus, like `disableLocalAuth`.

### Interfaces

- **IServiceBusSkuBuilder**: Interface for setting the SKU tier.
  - `withSku(sku: ServiceBusSkuTypes): IServiceBusBuilder`

- **IServiceBusBuilder**: Interface for configuring the Service Bus.
  - `withNetwork(props: NetworkPropsType): IServiceBusBuilder`
  - `withNetworkIf(condition: boolean, props: NetworkPropsType): IServiceBusBuilder`
  - `withOptions(props: ServiceBusOptions): IServiceBusBuilder`
  - `withQueues(props: Record<string, ServiceBusQueueArgs>): IServiceBusBuilder`
  - `withTopics(props: Record<string, ServiceBusTopicArgs>): IServiceBusBuilder`

## `ServiceBusBuilder.ts`

### Overview
This file implements the `ServiceBusBuilder` class, which uses the types and interfaces defined in `serviceBusBuilder.ts` to build an Azure Service Bus using Pulumi.

### Class: `ServiceBusBuilder`

#### What It Does
The `ServiceBusBuilder` class helps you configure and deploy an Azure Service Bus with queues, topics, and subscriptions using Pulumi.

#### How to Use It

1. **Initialize the Builder**:
   ```typescript
   import createServiceBusBuilder from './ServiceBusBuilder';
   import { ServiceBusBuilderArgs } from './types';

   const args: ServiceBusBuilderArgs = {
     // ... initialization properties
   };

   const serviceBusBuilder = createServiceBusBuilder(args);
   ```

2. **Configure the Service Bus**:
   ```typescript
   serviceBusBuilder
     .withSku('Standard')
     .withOptions({ disableLocalAuth: true })
     .withNetwork({ ipAddresses: ['10.0.0.1'], subnetId: 'subnet-id', privateLink: { type: 'namespace' } })
     .withQueues({
       myQueue: { maxDeliveryCount: 5, enablePartitioning: true }
     })
     .withTopics({
       myTopic: {
         enablePartitioning: true,
         subscriptions: {
           mySubscription: { maxDeliveryCount: 5 }
         }
       }
     });
   ```

3. **Build and Deploy**:
   ```typescript
   const resourceInfo = serviceBusBuilder.build();
   console.log('Service Bus deployed with ID:', resourceInfo.id);
   ```

### Methods

- **withSku(sku: ServiceBusSkuTypes)**: Sets the SKU tier.
- **withOptions(props: ServiceBusOptions)**: Sets additional options.
- **withNetwork(props: NetworkPropsType)**: Configures the network settings.
- **withNetworkIf(condition: boolean, props: NetworkPropsType)**: Conditionally configures the network settings.
- **withQueues(props: Record<string, ServiceBusQueueArgs>)**: Configures the queues.
- **withTopics(props: Record<string, ServiceBusTopicArgs>)**: Configures the topics and their subscriptions.
- **build()**: Executes the build process and returns the `ResourceInfo`.

### Example

```typescript
import createServiceBusBuilder from './ServiceBusBuilder';
import { ServiceBusBuilderArgs } from './types';

const args: ServiceBusBuilderArgs = {
  name: 'myServiceBus',
  group: { resourceGroupName: 'myResourceGroup' },
  enableEncryption: true,
  vaultInfo: { name: 'myKeyVault' },
  envUIDInfo: { id: 'myEnvUID' },
  dependsOn: [],
};

const serviceBusBuilder = createServiceBusBuilder(args);

serviceBusBuilder
  .withSku('Premium')
  .withOptions({ disableLocalAuth: true })
  .withNetwork({ ipAddresses: ['10.0.0.1'], subnetId: 'subnet-id', privateLink: { type: 'namespace' } })
  .withQueues({
    myQueue: { maxDeliveryCount: 5, enablePartitioning: true }
  })
  .withTopics({
    myTopic: {
      enablePartitioning: true,
      subscriptions: {
        mySubscription: { maxDeliveryCount: 5 }
      }
    }
  });

const resourceInfo = serviceBusBuilder.build();
console.log('Service Bus deployed with ID:', resourceInfo.id);
```

This documentation provides a clear and concise overview of how to use the `ServiceBusBuilder` class to configure and deploy an Azure Service Bus using Pulumi.