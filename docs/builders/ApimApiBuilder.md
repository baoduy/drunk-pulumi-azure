# Class: `ApimApiBuilder`

#### Constructor
**Purpose**: Initializes the `ApimApiBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new ApimApiBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
  requiredSubscription: true,
  productId: 'productId',
});
```



#### Method: `withPolicies`
**Purpose**: Sets the policies for the API.

**Usage**:
```typescript
builder.withPolicies((policyBuilder) => {
  return policyBuilder
    .setHeader({ name: 'headerName', type: 'add', value: 'headerValue' })
    .build();
});
```



#### Method: `withServiceUrl`
**Purpose**: Sets the service URL for the API.

**Usage**:
```typescript
builder.withServiceUrl({
  serviceUrl: 'https://api.example.com',
  apiPath: '/v1',
});
```



#### Method: `withVersion`
**Purpose**: Adds a version to the API.

**Usage**:
```typescript
builder.withVersion('v1', (versionBuilder) => {
  return versionBuilder.withRevision({
    revision: 1,
    operations: [{ name: 'Get', method: 'GET', urlTemplate: '/' }],
  });
});
```



#### Method: `withKeys`
**Purpose**: Sets the key parameters for the API.

**Usage**:
```typescript
builder.withKeys({
  header: 'x-api-key',
  query: 'api-key',
});
```



#### Method: `build`
**Purpose**: Builds the entire API with the configured properties.

**Usage**:
```typescript
const resourceInfo = await builder.build();
console.log(resourceInfo);
```



### Example Usage
Here is a complete example that demonstrates how to use the `ApimApiBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new ApimApiBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
  requiredSubscription: true,
  productId: 'productId',
});

builder
  .withPolicies((policyBuilder) => {
    return policyBuilder
      .setHeader({ name: 'headerName', type: 'add', value: 'headerValue' })
      .build();
  })
  .withServiceUrl({
    serviceUrl: 'https://api.example.com',
    apiPath: '/v1',
  })
  .withVersion('v1', (versionBuilder) => {
    return versionBuilder.withRevision({
      revision: 1,
      operations: [{ name: 'Get', method: 'GET', urlTemplate: '/' }],
    });
  })
  .withKeys({
    header: 'x-api-key',
    query: 'api-key',
  });

const resourceInfo = await builder.build();
console.log(resourceInfo);
```



### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `ApimApiBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new ApimApiBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
  requiredSubscription: true,
  productId: 'productId',
});
```



#### Method: `withPolicies`
**Purpose**: Sets the policies for the API.

**Usage**:
```typescript
builder.withPolicies((policyBuilder) => {
  return policyBuilder
    .setHeader({ name: 'headerName', type: 'add', value: 'headerValue' })
    .build();
});
```



#### Method: `withServiceUrl`
**Purpose**: Sets the service URL for the API.

**Usage**:
```typescript
builder.withServiceUrl({
  serviceUrl: 'https://api.example.com',
  apiPath: '/v1',
});
```



#### Method: `withVersion`
**Purpose**: Adds a version to the API.

**Usage**:
```typescript
builder.withVersion('v1', (versionBuilder) => {
  return versionBuilder.withRevision({
    revision: 1,
    operations: [{ name: 'Get', method: 'GET', urlTemplate: '/' }],
  });
});
```



#### Method: `withKeys`
**Purpose**: Sets the key parameters for the API.

**Usage**:
```typescript
builder.withKeys({
  header: 'x-api-key',
  query: 'api-key',
});
```



#### Method: `build`
**Purpose**: Builds the entire API with the configured properties.

**Usage**:
```typescript
const resourceInfo = await builder.build();
console.log(resourceInfo);
```



This example demonstrates how to create an `ApimApiBuilder` instance, configure it with various settings, and finally build the API. The `build()` method is called last to ensure the API is fully constructed.