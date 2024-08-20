# Class: `ApimBuilder`

#### Constructor
**Purpose**: Initializes the `ApimBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new ApimBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  logInfo: { appInsight: { id: 'appInsightId', instrumentationKey: 'instrumentationKey' } },
});
```


#### Method: `disableSignIn`
**Purpose**: Disables the sign-in feature for the API Management service.

**Usage**:
```typescript
builder.disableSignIn();
```


#### Method: `withAuth`
**Purpose**: Adds an authentication provider to the API Management service.

**Usage**:
```typescript
builder.withAuth({
  type: 'aad',
  clientId: 'clientId',
  clientSecret: 'clientSecret',
});
```


#### Method: `withEntraID`
**Purpose**: Enables Entra ID for the API Management service.

**Usage**:
```typescript
builder.withEntraID();
```


#### Method: `withCACert`
**Purpose**: Adds a CA certificate to the API Management service.

**Usage**:
```typescript
builder.withCACert({
  certificate: 'encodedCertificate',
  certificatePassword: 'password',
});
```


#### Method: `withRootCert`
**Purpose**: Adds a root certificate to the API Management service.

**Usage**:
```typescript
builder.withRootCert({
  certificate: 'encodedCertificate',
  certificatePassword: 'password',
});
```


#### Method: `withPrivateLink`
**Purpose**: Configures a private link for the API Management service.

**Usage**:
```typescript
builder.withPrivateLink({
  disablePublicAccess: true,
  privateEndpointName: 'privateEndpoint',
});
```


#### Method: `withSubnet`
**Purpose**: Configures a subnet for the API Management service.

**Usage**:
```typescript
builder.withSubnet({
  subnetId: 'subnetId',
  type: 'External',
  enableGateway: true,
});
```


#### Method: `restoreFomDeleted`
**Purpose**: Restores the API Management service from a deleted state.

**Usage**:
```typescript
builder.restoreFomDeleted();
```


#### Method: `withZones`
**Purpose**: Configures availability zones for the API Management service.

**Usage**:
```typescript
builder.withZones(['1', '2', '3']);
```


#### Method: `withAdditionalLocation`
**Purpose**: Adds additional locations for the API Management service.

**Usage**:
```typescript
builder.withAdditionalLocation({
  location: 'eastus',
  sku: { name: 'Premium', capacity: 1 },
});
```


#### Method: `withProxyDomain`
**Purpose**: Configures a proxy domain for the API Management service.

**Usage**:
```typescript
builder.withProxyDomain({
  domain: 'proxy.example.com',
  certificate: 'encodedCertificate',
  certificatePassword: 'password',
});
```


#### Method: `withPublisher`
**Purpose**: Configures the publisher information for the API Management service.

**Usage**:
```typescript
builder.withPublisher({
  publisherEmail: 'publisher@example.com',
  publisherName: 'Publisher Name',
});
```


#### Method: `withSku`
**Purpose**: Configures the SKU for the API Management service.

**Usage**:
```typescript
builder.withSku({
  sku: 'Premium',
  capacity: 2,
});
```


#### Method: `build`
**Purpose**: Builds the entire API Management service, including public IP address, APIM instance, private link, sign-in settings, Entra ID, authentication providers, and insight logs.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```


### Example Usage
Here is a complete example that demonstrates how to use the `ApimBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new ApimBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  logInfo: { appInsight: { id: 'appInsightId', instrumentationKey: 'instrumentationKey' } },
});

builder
  .disableSignIn()
  .withAuth({
    type: 'aad',
    clientId: 'clientId',
    clientSecret: 'clientSecret',
  })
  .withEntraID()
  .withCACert({
    certificate: 'encodedCertificate',
    certificatePassword: 'password',
  })
  .withRootCert({
    certificate: 'encodedCertificate',
    certificatePassword: 'password',
  })
  .withPrivateLink({
    disablePublicAccess: true,
    privateEndpointName: 'privateEndpoint',
  })
  .withSubnet({
    subnetId: 'subnetId',
    type: 'External',
    enableGateway: true,
  })
  .restoreFomDeleted()
  .withZones(['1', '2', '3'])
  .withAdditionalLocation({
    location: 'eastus',
    sku: { name: 'Premium', capacity: 1 },
  })
  .withProxyDomain({
    domain: 'proxy.example.com',
    certificate: 'encodedCertificate',
    certificatePassword: 'password',
  })
  .withPublisher({
    publisherEmail: 'publisher@example.com',
    publisherName: 'Publisher Name',
  })
  .withSku({
    sku: 'Premium',
    capacity: 2,
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```


This example demonstrates how to create an `ApimBuilder` instance, configure it with various settings, and finally build the API Management service. The `build()` method is called last to ensure the service is fully constructed.