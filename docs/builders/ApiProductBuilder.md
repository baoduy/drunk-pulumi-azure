# Class: `ApimProductBuilder`

#### Constructor
**Purpose**: Initializes the `ApimProductBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new ApimProductBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { /* vault info */ },
});
```

#### Method: `withPolicies`
**Purpose**: Sets the policies for the API product.

**Usage**:
```typescript
builder.withPolicies((policyBuilder) => {
  return policyBuilder
    .setHeader({ name: 'headerName', type: SetHeaderTypes.add, value: 'headerValue' })
});
```

#### Method: `requiredSubscription`
**Purpose**: Specifies that a subscription is required for the API product.

**Usage**:
```typescript
builder.requiredSubscription({
  approvalRequired: true,
  subscriptionsLimit: 10,
});
```

#### Method: `withApi`
**Purpose**: Adds an API to the product.

**Usage**:
```typescript
builder.withApi('apiName', (apiBuilder) => {
  return apiBuilder
    .withServiceUrl({ serviceUrl: 'https://api.example.com', apiPath: '/v1' })
    .withVersion('v1', (versionBuilder) => {
      return versionBuilder.withRevision({
        revision: 1,
        operations: [{ name: 'Get', method: 'GET', urlTemplate: '/' }],
      });
    });
});
```

#### Method: `withHookProxy`
**Purpose**: Adds a hook proxy API to the product.

**Usage**:
```typescript
builder.withHookProxy('hookProxyName', {
  authHeaderKey: 'Authorization',
  hookHeaderKey: 'X-Hook-Header',
});
```

#### Method: `published`
**Purpose**: Marks the product as published.

**Usage**:
```typescript
builder.published();
```

#### Method: `buildProduct`
**Purpose**: Builds the API product instance.

**Usage**:
This method is called internally by the `build` method and does not need to be called directly.

#### Method: `buildSubscription`
**Purpose**: Builds the subscription for the API product.

**Usage**:
This method is called internally by the `build` method and does not need to be called directly.

#### Method: `buildApis`
**Purpose**: Builds all the APIs added to the product.

**Usage**:
This method is called internally by the `build` method and does not need to be called directly.

#### Method: `build`
**Purpose**: Builds the entire API product, including the product instance, subscription, and APIs.

**Usage**:
```typescript
const resourceInfo = await builder.build();
console.log(resourceInfo);
```

### Example Usage
Here is a complete example that demonstrates how to use the `ApimProductBuilder` class:

```typescript
const builder = new ApimProductBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { /* vault info */ },
});

builder
  .withPolicies((policyBuilder) => {
    return policyBuilder
      .setHeader({ name: 'headerName', type: SetHeaderTypes.add, value: 'headerValue' })
  })
  .requiredSubscription({
    approvalRequired: true,
    subscriptionsLimit: 10,
  })
  .withApi('apiName', (apiBuilder) => {
    return apiBuilder
      .withServiceUrl({ serviceUrl: 'https://api.example.com', apiPath: '/v1' })
      .withVersion('v1', (versionBuilder) => {
        return versionBuilder.withRevision({
          revision: 1,
          operations: [{ name: 'Get', method: 'GET', urlTemplate: '/' }],
        });
      });
  })
  .withHookProxy('hookProxyName', {
    authHeaderKey: 'Authorization',
    hookHeaderKey: 'X-Hook-Header',
  })
  .published();

const resourceInfo = await builder.build();
console.log(resourceInfo);
```

This example demonstrates how to create an `ApimProductBuilder` instance, configure it with policies, required subscription, APIs, and hook proxies, mark it as published, and finally build the product.