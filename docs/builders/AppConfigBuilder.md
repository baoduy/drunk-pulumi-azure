# Class: `AppConfigBuilder`

#### Constructor
**Purpose**: Initializes the `AppConfigBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AppConfigBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { id: 'vaultId' },
  enableEncryption: true,
  dependsOn: [],
});
```




#### Method: `withOptions`
**Purpose**: Sets additional options for the App Configuration.

**Usage**:
```typescript
builder.withOptions({
  enablePurgeProtection: true,
  softDeleteRetentionInDays: 30,
});
```




#### Method: `withPrivateLink`
**Purpose**: Sets the private link configuration for the App Configuration.

**Usage**:
```typescript
builder.withPrivateLink({
  disableLocalAuth: true,
  privateEndpointName: 'privateEndpoint',
});
```




#### Method: `build`
**Purpose**: Builds the entire App Configuration resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```




### Example Usage
Here is a complete example that demonstrates how to use the `AppConfigBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new AppConfigBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { id: 'vaultId' },
  enableEncryption: true,
  dependsOn: [],
});

builder
  .withOptions({
    enablePurgeProtection: true,
    softDeleteRetentionInDays: 30,
  })
  .withPrivateLink({
    disableLocalAuth: true,
    privateEndpointName: 'privateEndpoint',
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```




### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `AppConfigBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AppConfigBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { id: 'vaultId' },
  enableEncryption: true,
  dependsOn: [],
});
```




#### Method: `withOptions`
**Purpose**: Sets additional options for the App Configuration.

**Usage**:
```typescript
builder.withOptions({
  enablePurgeProtection: true,
  softDeleteRetentionInDays: 30,
});
```




#### Method: `withPrivateLink`
**Purpose**: Sets the private link configuration for the App Configuration.

**Usage**:
```typescript
builder.withPrivateLink({
  disableLocalAuth: true,
  privateEndpointName: 'privateEndpoint',
});
```




#### Method: `build`
**Purpose**: Builds the entire App Configuration resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```




### Example Usage
Here is a complete example that demonstrates how to use the `AppConfigBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new AppConfigBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  vaultInfo: { id: 'vaultId' },
  enableEncryption: true,
  dependsOn: [],
});

builder
  .withOptions({
    enablePurgeProtection: true,
    softDeleteRetentionInDays: 30,
  })
  .withPrivateLink({
    disableLocalAuth: true,
    privateEndpointName: 'privateEndpoint',
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```




This example demonstrates how to create an `AppConfigBuilder` instance, configure it with various settings, and finally build the App Configuration resource. The `build()` method is called last to ensure the resource is fully constructed.