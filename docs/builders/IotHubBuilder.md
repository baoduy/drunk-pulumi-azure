# Class: `IotHubBuilder`

#### Constructor
**Purpose**: Initializes the `IotHubBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new IotHubBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { id: 'vaultId' },
  enableEncryption: true,
  dependsOn: [],
});
```






#### Method: `withSku`
**Purpose**: Sets the SKU for the IoT Hub.

**Usage**:
```typescript
builder.withSku({
  name: 'S1',
  capacity: 1,
});
```






#### Method: `withBus`
**Purpose**: Sets the Service Bus configuration for the IoT Hub.

**Usage**:
```typescript
builder.withBus({
  queueMessageConnectionString: 'queueConnectionString',
  topicMessageConnectionString: 'topicConnectionString',
});
```






#### Method: `withStorage`
**Purpose**: Sets the storage configuration for the IoT Hub.

**Usage**:
```typescript
builder.withStorage({
  connectionString: 'storageConnectionString',
  messageContainerName: 'messageContainer',
  eventContainerName: 'eventContainer',
  fileContainerName: 'fileContainer',
});
```






#### Method: `build`
**Purpose**: Builds the entire IoT Hub resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```






### Example Usage
Here is a complete example that demonstrates how to use the `IotHubBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new IotHubBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { id: 'vaultId' },
  enableEncryption: true,
  dependsOn: [],
});

builder
  .withSku({
    name: 'S1',
    capacity: 1,
  })
  .withBus({
    queueMessageConnectionString: 'queueConnectionString',
    topicMessageConnectionString: 'topicConnectionString',
  })
  .withStorage({
    connectionString: 'storageConnectionString',
    messageContainerName: 'messageContainer',
    eventContainerName: 'eventContainer',
    fileContainerName: 'fileContainer',
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```






### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `IotHubBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new IotHubBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { id: 'vaultId' },
  enableEncryption: true,
  dependsOn: [],
});
```






#### Method: `withSku`
**Purpose**: Sets the SKU for the IoT Hub.

**Usage**:
```typescript
builder.withSku({
  name: 'S1',
  capacity: 1,
});
```






#### Method: `withBus`
**Purpose**: Sets the Service Bus configuration for the IoT Hub.

**Usage**:
```typescript
builder.withBus({
  queueMessageConnectionString: 'queueConnectionString',
  topicMessageConnectionString: 'topicConnectionString',
});
```






#### Method: `withStorage`
**Purpose**: Sets the storage configuration for the IoT Hub.

**Usage**:
```typescript
builder.withStorage({
  connectionString: 'storageConnectionString',
  messageContainerName: 'messageContainer',
  eventContainerName: 'eventContainer',
  fileContainerName: 'fileContainer',
});
```






#### Method: `build`
**Purpose**: Builds the entire IoT Hub resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```






### Example Usage
Here is a complete example that demonstrates how to use the `IotHubBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new IotHubBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { id: 'vaultId' },
  enableEncryption: true,
  dependsOn: [],
});

builder
  .withSku({
    name: 'S1',
    capacity: 1,
  })
  .withBus({
    queueMessageConnectionString: 'queueConnectionString',
    topicMessageConnectionString: 'topicConnectionString',
  })
  .withStorage({
    connectionString: 'storageConnectionString',
    messageContainerName: 'messageContainer',
    eventContainerName: 'eventContainer',
    fileContainerName: 'fileContainer',
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```






This example demonstrates how to create an `IotHubBuilder` instance, configure it with various settings, and finally build the IoT Hub resource. The `build()` method is called last to ensure the resource is fully constructed.