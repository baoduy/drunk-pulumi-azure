# **AFDBuilder Class Documentation**

## **Overview**
The `AFDBuilder` class is designed to simplify the creation and configuration of Azure Front Door (AFD) resources using Pulumi. This class follows the Builder pattern, providing a fluent interface for defining various aspects of an AFD, including profiles, endpoints, custom domains, and response headers.

## **Key Methods and Their Attributes**

### **Constructor**
```typescript
constructor(props: BuilderProps)
```
Initializes the `AFDBuilder` with the provided arguments.

**Parameters:**
- `props`: BuilderProps - The basic configuration properties for the AFD resource.

**Usage:**
```typescript
const afdBuilder = new AFDBuilder({
  name: 'my-front-door',
  group: { resourceGroupName: 'my-resource-group' },
  // other necessary arguments
});
```

### **`withSdk(sdk: cdn.SkuName)`**
Sets the SKU for the Azure Front Door.

**Parameters:**
- `sdk`: cdn.SkuName - The SKU to set for the AFD:
  - `Standard_AzureFrontDoor`: Standard tier with basic features
  - `Premium_AzureFrontDoor`: Premium tier with advanced security and performance features

**Returns:** `IAFDBuilder` - The current AFDBuilder instance for method chaining.

**Usage:**
```typescript
afdBuilder.withSdk(cdn.SkuName.Premium_AzureFrontDoor);
```

### **`withCustomDomains(domains: string[])`**
Sets custom domains for the Azure Front Door.

**Parameters:**
- `domains`: string[] - Array of custom domain names to associate with the AFD.

**Returns:** `IAFDBuilder` - The current AFDBuilder instance for method chaining.

**Usage:**
```typescript
afdBuilder.withCustomDomains([
  'www.example.com',
  'api.example.com'
]);
```

### **`withCustomDomainsIf(condition: boolean, domains: string[])`**
Conditionally sets custom domains for the Azure Front Door.

**Parameters:**
- `condition`: boolean - Whether to apply the custom domains.
- `domains`: string[] - Array of custom domain names to associate with the AFD.

**Returns:** `IAFDBuilder` - The current AFDBuilder instance for method chaining.

**Usage:**
```typescript
afdBuilder.withCustomDomainsIf(isProd, [
  'www.example.com',
  'api.example.com'
]);
```

### **`withEndpoint(endpoint: AFDBuilderEndpoint)`**
Sets the endpoint configuration for the Azure Front Door.

**Parameters:**
- `endpoint`: AFDBuilderEndpoint - The endpoint configuration including routing rules and origins.

**Returns:** `IAFDBuilder` - The current AFDBuilder instance for method chaining.

**Usage:**
```typescript
afdBuilder.withEndpoint({
  origins: [{
    name: 'backend',
    hostName: 'backend.example.com',
    httpPort: 80,
    httpsPort: 443
  }],
  routes: [{
    name: 'default',
    patterns: ['/*'],
    originGroup: 'backend-group'
  }]
} as AFDBuilderEndpoint);
```

### **`withEndpointIf(condition: boolean, endpoint: AFDBuilderEndpoint)`**
Conditionally sets the endpoint configuration for the Azure Front Door.

**Parameters:**
- `condition`: boolean - Whether to apply the endpoint configuration.
- `endpoint`: AFDBuilderEndpoint - The endpoint configuration to set.

**Returns:** `IAFDBuilder` - The current AFDBuilder instance for method chaining.

### **`withResponseHeaders(headers: ResponseHeaderType)`**
Sets custom response headers for the Azure Front Door.

**Parameters:**
- `headers`: ResponseHeaderType - The response headers configuration to set.

**Returns:** `IAFDBuilder` - The current AFDBuilder instance for method chaining.

**Usage:**
```typescript
afdBuilder.withResponseHeaders({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
} as ResponseHeaderType);
```

### **`withResponseHeadersIf(condition: boolean, headers: ResponseHeaderType)`**
Conditionally sets custom response headers for the Azure Front Door.

**Parameters:**
- `condition`: boolean - Whether to apply the response headers.
- `headers`: ResponseHeaderType - The response headers configuration to set.

**Returns:** `IAFDBuilder` - The current AFDBuilder instance for method chaining.

### **`build()`**
Builds and deploys the AFD instance based on the current configuration.

**Returns:** `ResourceInfo` - Resource information for the deployed AFD instance.

**Usage:**
```typescript
const afdResource = afdBuilder.build();
```

## **Example of Full Usage**
Here's a complete example demonstrating how to use the `AFDBuilder` with all available properties:

```typescript
import { AFDBuilder } from './Builder/AFDBuilder';
import * as cdn from '@pulumi/azure-native/cdn';

const afdBuilder = new AFDBuilder({
  name: 'my-front-door',
  group: { resourceGroupName: 'my-resource-group' },
  // other necessary arguments
});

afdBuilder
  .withSdk(cdn.SkuName.Premium_AzureFrontDoor)
  .withCustomDomains([
    'www.example.com',
    'api.example.com'
  ])
  .withEndpoint({
    origins: [{
      name: 'backend',
      hostName: 'backend.example.com',
      httpPort: 80,
      httpsPort: 443
    }],
    routes: [{
      name: 'default',
      patterns: ['/*'],
      originGroup: 'backend-group'
    }]
  } as AFDBuilderEndpoint)
  .withResponseHeaders({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  } as ResponseHeaderType);

const afdResource = afdBuilder.build();
```

## **Summary**
- **Constructor**: Initializes the builder with necessary arguments.
- **withSdk**: Configures the SKU for the Azure Front Door.
- **withCustomDomains**: Sets custom domains for the AFD.
- **withCustomDomainsIf**: Conditionally sets custom domains.
- **withEndpoint**: Configures endpoint settings including origins and routes.
- **withEndpointIf**: Conditionally configures endpoint settings.
- **withResponseHeaders**: Sets custom response headers.
- **withResponseHeadersIf**: Conditionally sets custom response headers.
- **build**: Executes the build process and returns the resource information.

This guideline should help developers understand and reuse the methods in the `AFDBuilder` class effectively.