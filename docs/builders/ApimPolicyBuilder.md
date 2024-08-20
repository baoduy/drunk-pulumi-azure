# Class: `ApimPolicyBuilder`

#### Constructor
**Purpose**: Initializes the `ApimPolicyBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new ApimPolicyBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
});
```



#### Method: `setClientIpHeader`
**Purpose**: Sets the client IP header for the API.

**Usage**:
```typescript
builder.setClientIpHeader({
  headerKey: 'x-client-ip',
});
```



#### Method: `validateJwtWhitelistIp`
**Purpose**: Filters IP from Bearer Token.

**Usage**:
```typescript
builder.validateJwtWhitelistIp({
  claimKey: 'client_IpWhitelist',
});
```



#### Method: `setWhitelistIPs`
**Purpose**: Sets the IP address whitelisting.

**Usage**:
```typescript
builder.setWhitelistIPs({
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```



#### Method: `setFindAndReplaces`
**Purpose**: Replaces outbound results.

**Usage**:
```typescript
builder.setFindAndReplaces({
  from: 'oldValue',
  to: 'newValue',
});
```



#### Method: `build`
**Purpose**: Builds the entire policy with the configured properties.

**Usage**:
```typescript
const policyXml = builder.build();
console.log(policyXml);
```



### Example Usage
Here is a complete example that demonstrates how to use the `ApimPolicyBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new ApimPolicyBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
});

builder
  .setClientIpHeader({
    headerKey: 'x-client-ip',
  })
  .validateJwtWhitelistIp({
    claimKey: 'client_IpWhitelist',
  })
  .setWhitelistIPs({
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  })
  .setFindAndReplaces({
    from: 'oldValue',
    to: 'newValue',
  });

const policyXml = builder.build();
console.log(policyXml);
```



### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `ApimPolicyBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new ApimPolicyBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
});
```



#### Method: `setClientIpHeader`
**Purpose**: Sets the client IP header for the API.

**Usage**:
```typescript
builder.setClientIpHeader({
  headerKey: 'x-client-ip',
});
```



#### Method: `validateJwtWhitelistIp`
**Purpose**: Filters IP from Bearer Token.

**Usage**:
```typescript
builder.validateJwtWhitelistIp({
  claimKey: 'client_IpWhitelist',
});
```



#### Method: `setWhitelistIPs`
**Purpose**: Sets the IP address whitelisting.

**Usage**:
```typescript
builder.setWhitelistIPs({
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```



#### Method: `setFindAndReplaces`
**Purpose**: Replaces outbound results.

**Usage**:
```typescript
builder.setFindAndReplaces({
  from: 'oldValue',
  to: 'newValue',
});
```



#### Method: `build`
**Purpose**: Builds the entire policy with the configured properties.

**Usage**:
```typescript
const policyXml = builder.build();
console.log(policyXml);
```



### Example Usage
Here is a complete example that demonstrates how to use the `ApimPolicyBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new ApimPolicyBuilder({
  name: 'example',
  apimServiceName: 'apimService',
  group: { resourceGroupName: 'resourceGroup' },
});

builder
  .setClientIpHeader({
    headerKey: 'x-client-ip',
  })
  .validateJwtWhitelistIp({
    claimKey: 'client_IpWhitelist',
  })
  .setWhitelistIPs({
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  })
  .setFindAndReplaces({
    from: 'oldValue',
    to: 'newValue',
  });

const policyXml = builder.build();
console.log(policyXml);
```



This example demonstrates how to create an `ApimPolicyBuilder` instance, configure it with various settings, and finally build the policy. The `build()` method is called last to ensure the policy is fully constructed.