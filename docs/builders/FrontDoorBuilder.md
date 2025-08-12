# **FrontDoorBuilder Class Documentation**

## **Overview**
The `FrontDoorBuilder` class is designed to simplify the creation and configuration of Azure Front Door (classic) resources using Pulumi. This class follows the Builder pattern, providing a fluent interface for defining Front Door profiles and endpoints for global load balancing and content delivery.

## **Key Methods and Their Attributes**

### **Constructor**
```typescript
constructor(props: BuilderProps)
```
Initializes the `FrontDoorBuilder` with the provided arguments.

**Parameters:**
- `props`: BuilderProps - The basic configuration properties for the Front Door resource including:
  - `name`: string - The name of the Front Door service
  - `group`: ResourceGroupInfo - Resource group information
  - Other standard builder properties

**Usage:**
```typescript
const frontDoorBuilder = new FrontDoorBuilder({
  name: 'my-front-door',
  group: { resourceGroupName: 'my-resource-group' },
  // other necessary arguments
});
```

### **`withEndpoint(props: FrontDoorBuilderEndpointType)`**
Adds an endpoint configuration to the Front Door.

**Parameters:**
- `props`: FrontDoorBuilderEndpointType - The endpoint configuration including:
  - `name`: string - Name of the endpoint
  - `hostName`: string - Frontend host name
  - `sessionAffinityEnabled`: boolean - Whether session affinity is enabled
  - `sessionAffinityTtlSeconds`: number - Session affinity TTL in seconds
  - `backends`: array - Backend pool configuration
    - `address`: string - Backend server address
    - `httpPort`: number - HTTP port (default: 80)
    - `httpsPort`: number - HTTPS port (default: 443)
    - `weight`: number - Traffic distribution weight
    - `priority`: number - Failover priority
  - `routingRules`: array - URL routing rules
    - `name`: string - Rule name
    - `acceptedProtocols`: array - Accepted protocols (Http, Https)
    - `patternsToMatch`: array - URL patterns to match
    - `forwardingProtocol`: string - Backend forwarding protocol
  - `healthProbe`: object - Health probe configuration
    - `path`: string - Health check path
    - `protocol`: string - Health check protocol
    - `intervalInSeconds`: number - Probe interval

**Returns:** `IFrontDoorBuilder` - The current FrontDoorBuilder instance for method chaining.

**Usage:**
```typescript
frontDoorBuilder.withEndpoint({
  name: 'my-endpoint',
  hostName: 'example.azurefd.net',
  sessionAffinityEnabled: false,
  sessionAffinityTtlSeconds: 0,
  backends: [
    {
      address: 'backend1.example.com',
      httpPort: 80,
      httpsPort: 443,
      weight: 50,
      priority: 1
    },
    {
      address: 'backend2.example.com',
      httpPort: 80,
      httpsPort: 443,
      weight: 50,
      priority: 1
    }
  ],
  routingRules: [
    {
      name: 'default',
      acceptedProtocols: ['Https'],
      patternsToMatch: ['/*'],
      forwardingProtocol: 'HttpsOnly'
    }
  ],
  healthProbe: {
    path: '/health',
    protocol: 'Https',
    intervalInSeconds: 120
  }
} as FrontDoorBuilderEndpointType);
```

### **`build()`**
Builds and deploys the Front Door based on the current configuration.

**Returns:** `ResourceInfo` - Resource information for the deployed Front Door instance.

**Usage:**
```typescript
const frontDoorResource = frontDoorBuilder.build();
```

## **Example of Full Usage**
Here's a complete example demonstrating how to use the `FrontDoorBuilder` with endpoint configuration:

```typescript
import { FrontDoorBuilder } from './Builder/FrontDoorBuilder';
import { BuilderProps } from './types';

const props: BuilderProps = {
  name: 'my-front-door',
  group: { resourceGroupName: 'my-resource-group' },
  // other necessary arguments
};

const frontDoorBuilder = new FrontDoorBuilder(props);

frontDoorBuilder
  .withEndpoint({
    name: 'web-endpoint',
    hostName: 'myapp.azurefd.net',
    sessionAffinityEnabled: true,
    sessionAffinityTtlSeconds: 86400,
    backends: [
      {
        address: 'webapp-east.azurewebsites.net',
        httpPort: 80,
        httpsPort: 443,
        weight: 60,
        priority: 1
      },
      {
        address: 'webapp-west.azurewebsites.net',
        httpPort: 80,
        httpsPort: 443,
        weight: 40,
        priority: 2
      }
    ],
    routingRules: [
      {
        name: 'api-route',
        acceptedProtocols: ['Https'],
        patternsToMatch: ['/api/*'],
        forwardingProtocol: 'HttpsOnly'
      },
      {
        name: 'default-route',
        acceptedProtocols: ['Http', 'Https'],
        patternsToMatch: ['/*'],
        forwardingProtocol: 'MatchRequest'
      }
    ],
    healthProbe: {
      path: '/health',
      protocol: 'Https',
      intervalInSeconds: 60
    }
  } as FrontDoorBuilderEndpointType)
  .withEndpoint({
    name: 'api-endpoint',
    hostName: 'api.myapp.azurefd.net',
    sessionAffinityEnabled: false,
    backends: [
      {
        address: 'api-backend.example.com',
        httpPort: 80,
        httpsPort: 443,
        weight: 100,
        priority: 1
      }
    ],
    routingRules: [
      {
        name: 'api-only',
        acceptedProtocols: ['Https'],
        patternsToMatch: ['/*'],
        forwardingProtocol: 'HttpsOnly'
      }
    ],
    healthProbe: {
      path: '/status',
      protocol: 'Https',
      intervalInSeconds: 30
    }
  } as FrontDoorBuilderEndpointType);

const frontDoorResource = frontDoorBuilder.build();
```

## **Features**

### **Automatic Configuration**
- **Global Location**: Automatically configured for global deployment
- **Certificate Enforcement**: Backend pools configured to enforce certificate name checks
- **Timeout Settings**: Optimized send/receive timeout settings (60 seconds)
- **Enabled State**: Automatically enabled upon deployment

### **Load Balancing Features**
- **Multiple Backends**: Support for multiple backend servers per endpoint
- **Weight-based Distribution**: Traffic distribution based on backend weights
- **Priority-based Failover**: Automatic failover based on backend priority
- **Health Probes**: Configurable health monitoring for backends

### **Routing Features**
- **URL Pattern Matching**: Flexible URL pattern matching for routing rules
- **Protocol Handling**: Support for HTTP, HTTPS, and protocol matching
- **Session Affinity**: Optional session affinity with configurable TTL
- **Multiple Endpoints**: Support for multiple endpoints with different configurations

### **Security Features**
- **HTTPS Enforcement**: Support for HTTPS-only backends
- **Certificate Validation**: Automatic certificate name check enforcement
- **Protocol Flexibility**: Configurable accepted protocols per routing rule

## **Use Cases**
- **Global Load Balancing**: Distribute traffic across multiple regions
- **Content Delivery**: Accelerate content delivery globally
- **High Availability**: Automatic failover between backend servers
- **Traffic Management**: Route traffic based on URL patterns
- **Session Management**: Maintain user session affinity when needed

## **Summary**
- **Constructor**: Initializes the builder with necessary arguments for Front Door configuration.
- **withEndpoint**: Adds endpoint configurations with backends, routing rules, and health probes.
- **build**: Executes the build process and returns the resource information.

This guideline should help developers understand and reuse the methods in the `FrontDoorBuilder` class effectively for global traffic management and content delivery scenarios.