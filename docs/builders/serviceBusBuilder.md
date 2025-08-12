# **ServiceBusBuilder Class Documentation**

## **Overview**
The `ServiceBusBuilder` class is designed to simplify the creation and configuration of Azure Service Bus resources using Pulumi. This class follows the Builder pattern, providing a fluent interface for defining various aspects of a Service Bus, including namespaces, SKU selection, network configurations, queues, and topics.

## **Key Methods and Their Attributes**

### **Constructor**
```typescript
constructor(args: ServiceBusBuilderArgs)
```
Initializes the `ServiceBusBuilder` with the provided arguments and sets the instance name.

**Parameters:**
- `args`: ServiceBusBuilderArgs - The basic configuration properties for the Service Bus resource.

**Usage:**
```typescript
const serviceBusBuilder = new ServiceBusBuilder({
  name: 'myServiceBus',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```

### **`withSku(sku: ServiceBusSkuTypes)`**
Sets the SKU for the Service Bus namespace.

**Parameters:**
- `sku`: ServiceBusSkuTypes - The SKU to set:
  - `'Basic'`: Basic tier with limited features
  - `'Standard'`: Standard tier with topics and subscriptions
  - `'Premium'`: Premium tier with advanced features and network isolation

**Returns:** `IServiceBusBuilder` - The current ServiceBusBuilder instance for method chaining.

**Usage:**
```typescript
serviceBusBuilder.withSku('Premium');
```

### **`withOptions(props: ServiceBusOptions)`**
Sets additional options for the Service Bus namespace.

**Parameters:**
- `props`: ServiceBusOptions - Configuration options for the Service Bus namespace.

**Returns:** `IServiceBusBuilder` - The current ServiceBusBuilder instance for method chaining.

**Usage:**
```typescript
serviceBusBuilder.withOptions({
  // ServiceBusOptions properties
  disableLocalAuth: true,
  minimumTlsVersion: '1.2'
});
```

### **`withNetwork(props: NetworkPropsType)`**
Sets the network properties for the Service Bus. 
**Note:** Network configuration is only supported for 'Premium' tier.

**Parameters:**
- `props`: NetworkPropsType - Network configuration including:
  - `subnetId`: string - The subnet ID for private endpoint
  - `privateLink`: Private link configuration
  - `ipAddresses`: string[] - Array of IP addresses for network rules

**Returns:** `IServiceBusBuilder` - The current ServiceBusBuilder instance for method chaining.

**Throws:** Error when network is configured for non-Premium tier.

**Usage:**
```typescript
serviceBusBuilder.withNetwork({
  subnetId: 'subnet-id',
  privateLink: {
    subnetIds: ['subnet-id-1', 'subnet-id-2'],
    privateDnsZoneId: 'dns-zone-id'
  },
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```

### **`withNetworkIf(condition: boolean, props: NetworkPropsType)`**
Conditionally sets the network properties for the Service Bus.

**Parameters:**
- `condition`: boolean - Whether to apply the network configuration.
- `props`: NetworkPropsType - Network configuration properties.

**Returns:** `IServiceBusBuilder` - The current ServiceBusBuilder instance for method chaining.

**Usage:**
```typescript
serviceBusBuilder.withNetworkIf(isPremiumTier, {
  subnetId: 'subnet-id',
  privateLink: {
    subnetIds: ['subnet-id-1'],
    privateDnsZoneId: 'dns-zone-id'
  },
  ipAddresses: ['192.168.1.1'],
});
```

### **`withQueues(props: Record<string, ServiceBusQueueArgs>)`**
Adds queues to the Service Bus namespace.

**Parameters:**
- `props`: Record<string, ServiceBusQueueArgs> - A record of queue names and their configurations:
  - Key: Queue name
  - Value: ServiceBusQueueArgs with properties like:
    - `maxDeliveryCount`: number - Maximum delivery attempts
    - `defaultMessageTimeToLive`: string - Message TTL
    - `lockDuration`: string - Message lock duration
    - `enablePartitioning`: boolean - Enable partitioning
    - `deadLetteringOnMessageExpiration`: boolean - Enable dead lettering

**Returns:** `IServiceBusBuilder` - The current ServiceBusBuilder instance for method chaining.

**Usage:**
```typescript
serviceBusBuilder.withQueues({
  'order-queue': {
    maxDeliveryCount: 5,
    defaultMessageTimeToLive: 'P7D',
    lockDuration: 'PT30S',
    enablePartitioning: true,
    deadLetteringOnMessageExpiration: true
  },
  'notification-queue': {
    maxDeliveryCount: 3,
    defaultMessageTimeToLive: 'P1D'
  }
});
```

### **`withTopics(props: Record<string, ServiceBusTopicArgs>)`**
Adds topics to the Service Bus namespace.

**Parameters:**
- `props`: Record<string, ServiceBusTopicArgs> - A record of topic names and their configurations:
  - Key: Topic name
  - Value: ServiceBusTopicArgs with properties like:
    - `defaultMessageTimeToLive`: string - Message TTL
    - `enablePartitioning`: boolean - Enable partitioning
    - `maxSizeInMegabytes`: number - Maximum topic size
    - `subscriptions`: Record<string, ServiceBusSubArgs> - Topic subscriptions

**Returns:** `IServiceBusBuilder` - The current ServiceBusBuilder instance for method chaining.

**Usage:**
```typescript
serviceBusBuilder.withTopics({
  'order-events': {
    defaultMessageTimeToLive: 'P30D',
    enablePartitioning: true,
    maxSizeInMegabytes: 1024,
    subscriptions: {
      'email-processor': {
        maxDeliveryCount: 5,
        lockDuration: 'PT1M'
      },
      'sms-processor': {
        maxDeliveryCount: 3,
        lockDuration: 'PT30S'
      }
    }
  }
});
```

### **`build()`**
Builds the Service Bus namespace, network settings, queues, and topics, and returns the resource information.

**Returns:** `ResourceInfo` - Resource information for the deployed Service Bus instance.

**Usage:**
```typescript
const resourceInfo = serviceBusBuilder.build();
console.log(resourceInfo);
```

## **Example of Full Usage**
Here's a complete example demonstrating how to use the `ServiceBusBuilder` with all available properties:

```typescript
import { ServiceBusBuilder } from './Builder/ServiceBusBuilder';
import { ServiceBusBuilderArgs } from './types';

const args: ServiceBusBuilderArgs = {
  name: 'myServiceBus',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const serviceBusBuilder = new ServiceBusBuilder(args);

serviceBusBuilder
  .withSku('Premium')
  .withOptions({
    disableLocalAuth: true,
    minimumTlsVersion: '1.2'
  })
  .withNetwork({
    subnetId: 'subnet-id',
    privateLink: {
      subnetIds: ['subnet-id-1', 'subnet-id-2'],
      privateDnsZoneId: 'dns-zone-id'
    },
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  })
  .withQueues({
    'order-queue': {
      maxDeliveryCount: 5,
      defaultMessageTimeToLive: 'P7D',
      lockDuration: 'PT30S',
      enablePartitioning: true,
      deadLetteringOnMessageExpiration: true
    },
    'notification-queue': {
      maxDeliveryCount: 3,
      defaultMessageTimeToLive: 'P1D'
    }
  })
  .withTopics({
    'order-events': {
      defaultMessageTimeToLive: 'P30D',
      enablePartitioning: true,
      maxSizeInMegabytes: 1024,
      subscriptions: {
        'email-processor': {
          maxDeliveryCount: 5,
          lockDuration: 'PT1M'
        },
        'sms-processor': {
          maxDeliveryCount: 3,
          lockDuration: 'PT30S'
        }
      }
    }
  });

const resourceInfo = serviceBusBuilder.build();
console.log(resourceInfo);
```

## **Summary**
- **Constructor**: Initializes the builder with necessary arguments.
- **withSku**: Configures the SKU for the Service Bus (Basic, Standard, Premium).
- **withOptions**: Sets additional options like authentication and TLS settings.
- **withNetwork**: Configures network settings including private endpoints (Premium only).
- **withNetworkIf**: Conditionally configures network settings.
- **withQueues**: Adds queues with specific configurations.
- **withTopics**: Adds topics with subscriptions.
- **build**: Executes the build process and returns resource information.

This guideline should help developers understand and reuse the methods in the `ServiceBusBuilder` class effectively.