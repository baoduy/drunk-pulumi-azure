# Class: `AppCertBuilder`

#### Constructor
**Purpose**: Initializes the `AppCertBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AppCertBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  dependsOn: [],
});
```




#### Method: `for`
**Purpose**: Sets the domain-specific options for the certificate.

**Usage**:
```typescript
builder.for({
  type: 'Standard',
  domain: 'example.com',
  keySize: 2048,
});
```




#### Method: `build`
**Purpose**: Builds the entire App Service Certificate Order with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```




### Example Usage
Here is a complete example that demonstrates how to use the `AppCertBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new AppCertBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  dependsOn: [],
});

builder.for({
  type: 'Standard',
  domain: 'example.com',
  keySize: 2048,
});

const resourceInfo = builder.build();
console.log(resourceInfo);
```




### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `AppCertBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AppCertBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  dependsOn: [],
});
```




#### Method: `for`
**Purpose**: Sets the domain-specific options for the certificate.

**Usage**:
```typescript
builder.for({
  type: 'Standard',
  domain: 'example.com',
  keySize: 2048,
});
```




#### Method: `build`
**Purpose**: Builds the entire App Service Certificate Order with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```




### Example Usage
Here is a complete example that demonstrates how to use the `AppCertBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new AppCertBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  dependsOn: [],
});

builder.for({
  type: 'Standard',
  domain: 'example.com',
  keySize: 2048,
});

const resourceInfo = builder.build();
console.log(resourceInfo);
```




This example demonstrates how to create an `AppCertBuilder` instance, configure it with domain-specific options, and finally build the App Service Certificate Order. The `build()` method is called last to ensure the certificate is fully constructed.