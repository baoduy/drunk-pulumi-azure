# Class: `AcrBuilder`

#### Constructor
**Purpose**: Initializes the `AcrBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AcrBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  enableEncryption: true,
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { /* vault info */ },
});
```


#### Method: `withSku`
**Purpose**: Sets the SKU for the Azure Container Registry (ACR).

**Usage**:
```typescript
builder.withSku(registry.SkuName.Premium);
```


#### Method: `withNetwork`
**Purpose**: Sets the network configuration for the ACR.

**Usage**:
```typescript
builder.withNetwork({
  privateLink: { /* private link configuration */ },
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```


#### Method: `withPolicy`
**Purpose**: Sets the policies for the ACR.

**Usage**:
```typescript
builder.withPolicy({
  retentionDay: 30,
});
```


#### Method: `build`
**Purpose**: Builds the entire ACR resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```


### Example Usage
Here is a complete example that demonstrates how to use the `AcrBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new AcrBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  enableEncryption: true,
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { /* vault info */ },
});

builder
  .withSku(registry.SkuName.Premium)
  .withNetwork({
    privateLink: { /* private link configuration */ },
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  })
  .withPolicy({
    retentionDay: 30,
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```


### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `AcrBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AcrBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  enableEncryption: true,
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { /* vault info */ },
});
```


#### Method: `withSku`
**Purpose**: Sets the SKU for the Azure Container Registry (ACR).

**Usage**:
```typescript
builder.withSku(registry.SkuName.Premium);
```


#### Method: `withNetwork`
**Purpose**: Sets the network configuration for the ACR.

**Usage**:
```typescript
builder.withNetwork({
  privateLink: { /* private link configuration */ },
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```


#### Method: `withPolicy`
**Purpose**: Sets the policies for the ACR.

**Usage**:
```typescript
builder.withPolicy({
  retentionDay: 30,
});
```


#### Method: `build`
**Purpose**: Builds the entire ACR resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```


This example demonstrates how to create an `AcrBuilder` instance, configure it with SKU, network settings, and policies, and finally build the ACR resource. The `build()` method is called last to ensure the resource is fully constructed.