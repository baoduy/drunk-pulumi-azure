# **ApimProductBuilder Class Documentation**

## **Overview**
The `ApimProductBuilder` class is designed to simplify the creation and configuration of Azure API Management (APIM) Product resources using Pulumi. This class follows the Builder pattern, providing a fluent interface for defining APIM products with APIs, subscriptions, policies, and specialized hook proxy configurations.

## **Key Methods and Their Attributes**

### **Constructor**
```typescript
constructor(args: ApimChildBuilderProps)
```
Initializes the `ApimProductBuilder` with the provided arguments.

**Parameters:**
- `args`: ApimChildBuilderProps - The configuration properties for the APIM Product including:
  - `name`: string - The name of the product
  - `group`: ResourceGroupInfo - Resource group information
  - `apimServiceName`: string - The APIM service name
  - `vaultInfo`: object - Key Vault information for storing secrets
  - `dependsOn`: array - Resource dependencies

**Usage:**
```typescript
const apimProductBuilder = new ApimProductBuilder({
  name: 'my-api-product',
  group: { resourceGroupName: 'my-resource-group' },
  apimServiceName: 'my-apim-service',
  vaultInfo: { name: 'my-keyvault', id: 'vault-id' },
  // other necessary arguments
});
```

### **`withPolicies(props: ApimApiPolicyType)`**
Sets policies for the APIM Product using a policy builder function.

**Parameters:**
- `props`: ApimApiPolicyType - A function that takes a policy builder and returns a configured policy with rules like:
  - Rate limiting
  - IP filtering
  - Header manipulation
  - Authentication requirements
  - Caching policies

**Returns:** `IApimProductBuilder` - The current ApimProductBuilder instance for method chaining.

**Usage:**
```typescript
apimProductBuilder.withPolicies((policyBuilder) =>
  policyBuilder
    .rateLimit({ calls: 100, renewalPeriod: 60 })
    .allowOrigin(['https://example.com'])
    .checkHeader({ name: 'API-Key' })
);
```

### **`requiredSubscription(props: ApimProductSubscriptionBuilderType)`**
Configures subscription requirements for the APIM Product.

**Parameters:**
- `props`: ApimProductSubscriptionBuilderType - The subscription configuration including:
  - `subscriptionsLimit`: number - Maximum number of subscriptions allowed (default: 5)
  - `approvalRequired`: boolean - Whether subscription approval is required
  - `autoApprove`: boolean - Whether to automatically approve subscriptions

**Returns:** `IApimProductBuilder` - The current ApimProductBuilder instance for method chaining.

**Usage:**
```typescript
apimProductBuilder.requiredSubscription({
  subscriptionsLimit: 10,
  approvalRequired: true,
  autoApprove: false
});
```

### **`withApi(name: string, props: APimApiBuilderFunction)`**
Adds an API to the APIM Product.

**Parameters:**
- `name`: string - The name of the API
- `props`: APimApiBuilderFunction - A function that configures the API builder with:
  - Service URL configuration
  - API operations and versions
  - Authentication settings
  - Custom policies
  - Path templates

**Returns:** `IApimProductBuilder` - The current ApimProductBuilder instance for method chaining.

**Usage:**
```typescript
apimProductBuilder.withApi('user-service', (apiBuilder) =>
  apiBuilder
    .withServiceUrl({
      serviceUrl: 'https://api.backend.com',
      apiPath: '/users'
    })
    .withKeys({ header: 'X-API-Key' })
    .withVersion('v1', {
      operations: [
        { name: 'GetUsers', method: 'GET', urlTemplate: '/' },
        { name: 'CreateUser', method: 'POST', urlTemplate: '/' },
        { name: 'GetUser', method: 'GET', urlTemplate: '/{id}' }
      ]
    })
    .withPolicies((p) =>
      p.rateLimit({ calls: 50, renewalPeriod: 60 })
    )
);
```

### **`withHookProxy(name: string, props: ApimHookProxyBuilderType)`**
Adds a specialized hook proxy API for webhook forwarding scenarios.

**Parameters:**
- `name`: string - The name of the hook proxy API
- `props`: ApimHookProxyBuilderType - The hook proxy configuration including:
  - `authHeaderKey`: string - Header key for authentication
  - `hookHeaderKey`: string - Header key containing the destination URL

**Returns:** `IApimProductBuilder` - The current ApimProductBuilder instance for method chaining.

**Features:**
- Automatically sets up a proxy service at `https://hook.proxy.local`
- Configures header validation and manipulation
- Removes authentication headers before forwarding
- Uses the hook header to determine destination URL

**Usage:**
```typescript
apimProductBuilder.withHookProxy('webhook-proxy', {
  authHeaderKey: 'X-Auth-Token',
  hookHeaderKey: 'X-Destination-URL'
});
```

### **`published()`**
Sets the product state to published, making it available for subscription.

**Returns:** `IBuilderAsync<ResourceInfo>` - The current ApimProductBuilder instance for method chaining.

**Usage:**
```typescript
apimProductBuilder.published();
```

### **`buildAsync()`**
Builds and deploys the APIM Product with all configured APIs and settings.

**Returns:** `Promise<ResourceInfo>` - Promise resolving to resource information for the deployed product.

**Usage:**
```typescript
const productResource = await apimProductBuilder.buildAsync();
```

## **Example of Full Usage**
Here's a complete example demonstrating how to use the `ApimProductBuilder` with all available features:

```typescript
import { ApimProductBuilder } from './Builder/ApimProductBuilder';
import { ApimChildBuilderProps } from './types';

const args: ApimChildBuilderProps = {
  name: 'ecommerce-api',
  group: { resourceGroupName: 'my-resource-group' },
  apimServiceName: 'my-apim-service',
  vaultInfo: { name: 'my-keyvault', id: 'vault-id' },
  // other necessary arguments
};

const apimProductBuilder = new ApimProductBuilder(args);

const productResource = await apimProductBuilder
  .withPolicies((policyBuilder) =>
    policyBuilder
      .rateLimit({ calls: 1000, renewalPeriod: 3600 })
      .allowOrigin(['https://myapp.com', 'https://admin.myapp.com'])
      .checkHeader({ name: 'X-API-Key' })
  )
  .requiredSubscription({
    subscriptionsLimit: 50,
    approvalRequired: false,
    autoApprove: true
  })
  .withApi('user-service', (apiBuilder) =>
    apiBuilder
      .withServiceUrl({
        serviceUrl: 'https://users.backend.com',
        apiPath: '/api/v1/users'
      })
      .withKeys({ header: 'X-API-Key' })
      .withVersion('v1', {
        operations: [
          { name: 'GetUsers', method: 'GET', urlTemplate: '/' },
          { name: 'CreateUser', method: 'POST', urlTemplate: '/' },
          { name: 'GetUser', method: 'GET', urlTemplate: '/{id}' },
          { name: 'UpdateUser', method: 'PUT', urlTemplate: '/{id}' },
          { name: 'DeleteUser', method: 'DELETE', urlTemplate: '/{id}' }
        ]
      })
      .withPolicies((p) =>
        p.rateLimit({ calls: 100, renewalPeriod: 60 })
      )
  )
  .withApi('order-service', (apiBuilder) =>
    apiBuilder
      .withServiceUrl({
        serviceUrl: 'https://orders.backend.com',
        apiPath: '/api/v1/orders'
      })
      .withKeys({ header: 'X-API-Key' })
      .withVersion('v1', {
        operations: [
          { name: 'GetOrders', method: 'GET', urlTemplate: '/' },
          { name: 'CreateOrder', method: 'POST', urlTemplate: '/' },
          { name: 'GetOrder', method: 'GET', urlTemplate: '/{orderId}' }
        ]
      })
  )
  .withHookProxy('payment-webhooks', {
    authHeaderKey: 'X-Payment-Auth',
    hookHeaderKey: 'X-Webhook-URL'
  })
  .published()
  .buildAsync();
```

## **Features**

### **Automatic Configuration**
- **Product Naming**: Automatically generates product names with `-product` suffix
- **Policy Integration**: Seamless integration with ApimPolicyBuilder
- **Subscription Management**: Automatic subscription creation when required
- **Key Vault Storage**: Automatic storage of subscription keys in Key Vault

### **API Management Features**
- **Multiple APIs**: Support for multiple APIs within a single product
- **Version Control**: API versioning with operation definitions
- **Policy Inheritance**: Product-level policies apply to all APIs
- **Subscription Control**: Configurable subscription limits and approval

### **Hook Proxy Features**
- **Webhook Forwarding**: Specialized proxy for webhook scenarios
- **Header Manipulation**: Automatic header validation and cleanup
- **Dynamic Routing**: URL destination based on request headers
- **Security**: Authentication header removal before forwarding

### **Security Features**
- **Subscription Keys**: Automatic generation and secure storage
- **Rate Limiting**: Built-in rate limiting capabilities
- **Header Validation**: Required header checking
- **Origin Control**: CORS origin management

## **Summary**
- **Constructor**: Initializes the builder with APIM service and Key Vault configuration.
- **withPolicies**: Configures product-level policies using policy builder functions.
- **requiredSubscription**: Sets up subscription requirements and limits.
- **withApi**: Adds APIs with operations, versions, and custom policies.
- **withHookProxy**: Creates specialized webhook proxy APIs.
- **published**: Makes the product available for public subscription.
- **buildAsync**: Executes the async build process and returns resource information.

This guideline should help developers understand and reuse the methods in the `ApimProductBuilder` class effectively for comprehensive API product management scenarios.