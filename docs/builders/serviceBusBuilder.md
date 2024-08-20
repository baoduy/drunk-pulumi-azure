# `ServiceBusBuilder` Class Overview

The `ServiceBusBuilder` class is designed to build and configure an Azure Service Bus instance with specific configurations such as SKU, network settings, queues, topics, and subscriptions.

### Constructor
#### Purpose:
Initializes the `ServiceBusBuilder` with the provided arguments and sets the instance name.

#### Sample Usage:
```typescript
const serviceBusBuilder = new ServiceBusBuilder({
  name: 'myServiceBus',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```


### `withSku`
#### Purpose:
Sets the SKU for the Service Bus.

#### Sample Usage:
```typescript
serviceBusBuilder.withSku('Standard');
```


### `withOptions`
#### Purpose:
Sets additional options for the Service Bus.

#### Sample Usage:
```typescript
serviceBusBuilder.withOptions({
  // ServiceBusOptions properties
});
```


### `withNetwork`
#### Purpose:
Sets the network properties for the Service Bus. Only supported for 'Premium' tier.

#### Sample Usage:
```typescript
serviceBusBuilder.withNetwork({
  subnetId: 'subnet-id',
  privateLink: {
    // private link properties
  },
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```


### `withNetworkIf`
#### Purpose:
Conditionally sets the network properties for the Service Bus.

#### Sample Usage:
```typescript
serviceBusBuilder.withNetworkIf(true, {
  subnetId: 'subnet-id',
  privateLink: {
    // private link properties
  },
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```


### `withQueues`
#### Purpose:
Sets the queues for the Service Bus.

#### Sample Usage:
```typescript
serviceBusBuilder.withQueues({
  myQueue: {
    // ServiceBusQueueArgs properties
  },
});
```


### `withTopics`
#### Purpose:
Sets the topics for the Service Bus.

#### Sample Usage:
```typescript
serviceBusBuilder.withTopics({
  myTopic: {
    // ServiceBusTopicArgs properties
  },
});
```


### `buildNamespace`
#### Purpose:
Creates the Service Bus namespace with the specified configurations.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildNetwork`
#### Purpose:
Configures network settings for the Service Bus, including IP rules and private link.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildQueues`
#### Purpose:
Creates the queues for the Service Bus.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildTopics`
#### Purpose:
Creates the topics for the Service Bus and their subscriptions.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildSubscriptions`
#### Purpose:
Creates the subscriptions for a given topic.

#### Sample Usage:
This method is called internally by the `buildTopics` method and is not typically called directly.

### `buildConnectionString`
#### Purpose:
Creates the connection strings for the Service Bus entities and stores them in Key Vault.

#### Sample Usage:
This method is called internally by the `buildQueues` and `buildTopics` methods and is not typically called directly.

### `build`
#### Purpose:
Builds the Service Bus namespace, network settings, queues, and topics, and returns the resource information.

#### Sample Usage:
```typescript
const resourceInfo = serviceBusBuilder.build();
console.log(resourceInfo);
```


### Full Example
Here is a full example demonstrating how to use the `ServiceBusBuilder` class:

```typescript
import ServiceBusBuilder from './Builder/ServiceBusBuilder';
import { ServiceBusBuilderArgs } from './types';

const args: ServiceBusBuilderArgs = {
  name: 'myServiceBus',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const serviceBusBuilder = new ServiceBusBuilder(args);

serviceBusBuilder
  .withSku('Standard')
  .withOptions({
    // ServiceBusOptions properties
  })
  .withNetwork({
    subnetId: 'subnet-id',
    privateLink: {
      // private link properties
    },
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  })
  .withQueues({
    myQueue: {
      // ServiceBusQueueArgs properties
    },
  })
  .withTopics({
    myTopic: {
      // ServiceBusTopicArgs properties
    },
  });

const resourceInfo = serviceBusBuilder.build();
console.log(resourceInfo);
```


### Summary
- **Constructor**: Initializes the builder with necessary arguments.
- **withSku**: Configures the SKU for the Service Bus.
- **withOptions**: Sets additional options for the Service Bus.
- **withNetwork**: Configures network settings for the Service Bus.
- **withNetworkIf**: Conditionally configures network settings for the Service Bus.
- **withQueues**: Sets the queues for the Service Bus.
- **withTopics**: Sets the topics for the Service Bus.
- **buildNamespace**: Internally creates the Service Bus namespace.
- **buildNetwork**: Internally configures network settings.
- **buildQueues**: Internally creates the queues for the Service Bus.
- **buildTopics**: Internally creates the topics for the Service Bus.
- **buildSubscriptions**: Internally creates the subscriptions for a given topic.
- **buildConnectionString**: Internally creates the connection strings for the Service Bus entities.
- **build**: Executes the build process and returns resource information.

This guideline should help developers understand and reuse the methods in the `ServiceBusBuilder` class effectively.