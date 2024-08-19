# `ResourceBuilder` Class Overview

The `ResourceBuilder` class is designed to build and configure various Azure resources, including resource groups, roles, vaults, and virtual networks. It provides a fluent interface for chaining method calls to configure the resources.

### Constructor
#### Purpose:
Initializes the `ResourceBuilder` with the provided name.

#### Sample Usage:
```typescript
const resourceBuilder = new ResourceBuilder('myResource');
```

### `createRoles`
#### Purpose:
Enables the creation of roles for the resource group.

#### Sample Usage:
```typescript
resourceBuilder.createRoles();
```

### `withRoles`
#### Purpose:
Sets the environment roles for the resource group.

#### Sample Usage:
```typescript
resourceBuilder.withRoles({
  // EnvRolesInfo properties
});
```

### `createEnvUID`
#### Purpose:
Enables the creation of a User Assigned Identity for encryption purposes.

#### Sample Usage:
```typescript
resourceBuilder.createEnvUID();
```

### `withEnvUIDFromVault`
#### Purpose:
Loads the User Assigned Identity from the vault.

#### Sample Usage:
```typescript
resourceBuilder.withEnvUIDFromVault();
```

### `withRolesFromVault`
#### Purpose:
Loads roles from the vault.

#### Sample Usage:
```typescript
resourceBuilder.withRolesFromVault();
```

### `createRG`
#### Purpose:
Enables the creation of a resource group with optional role enablement properties.

#### Sample Usage:
```typescript
resourceBuilder.createRG({
  enableRGRoles: { readOnly: true },
  enableVaultRoles: true,
});
```

### `withRG`
#### Purpose:
Sets the resource group information.

#### Sample Usage:
```typescript
resourceBuilder.withRG({
  resourceGroupName: 'myResourceGroup',
  location: 'West US',
});
```

### `createVault`
#### Purpose:
Enables the creation of a Key Vault with an optional name.

#### Sample Usage:
```typescript
resourceBuilder.createVault('myKeyVault');
```

### `withVault`
#### Purpose:
Sets the Key Vault information.

#### Sample Usage:
```typescript
resourceBuilder.withVault({
  // KeyVaultInfo properties
});
```

### `withVaultFrom`
#### Purpose:
Loads the Key Vault information from a given name.

#### Sample Usage:
```typescript
resourceBuilder.withVaultFrom('myKeyVault');
```

### `linkVaultTo`
#### Purpose:
Links the Key Vault to specified network properties.

#### Sample Usage:
```typescript
resourceBuilder.linkVaultTo({
  asPrivateLink: true,
  subnetNames: ['subnet1', 'subnet2'],
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```

### `addSecrets`
#### Purpose:
Adds secrets to the Key Vault.

#### Sample Usage:
```typescript
resourceBuilder.addSecrets({
  secretName: pulumi.secret('secretValue'),
});
```

### `addCerts`
#### Purpose:
Adds certificates to the Key Vault.

#### Sample Usage:
```typescript
resourceBuilder.addCerts({
  name: 'certName',
  // other CertBuilderType properties
});
```

### `withVnet`
#### Purpose:
Sets the virtual network properties.

#### Sample Usage:
```typescript
resourceBuilder.withVnet({
  // ResourceVnetBuilderType properties
});
```

### `enableEncryption`
#### Purpose:
Enables or disables encryption.

#### Sample Usage:
```typescript
resourceBuilder.enableEncryption(true);
```

### `withLogFrom`
#### Purpose:
Loads log information from a given name.

#### Sample Usage:
```typescript
resourceBuilder.withLogFrom('logName');
```

### `withBuilder`
#### Purpose:
Adds a custom builder function.

#### Sample Usage:
```typescript
resourceBuilder.withBuilder((results) => {
  // custom builder logic
});
```

### `withBuilderIf`
#### Purpose:
Conditionally adds a custom builder function.

#### Sample Usage:
```typescript
resourceBuilder.withBuilderIf(true, (results) => {
  // custom builder logic
});
```

### `withBuilderAsync`
#### Purpose:
Adds an asynchronous custom builder function.

#### Sample Usage:
```typescript
resourceBuilder.withBuilderAsync(async (results) => {
  // custom async builder logic
});
```

### `withBuilderAsyncIf`
#### Purpose:
Conditionally adds an asynchronous custom builder function.

#### Sample Usage:
```typescript
resourceBuilder.withBuilderAsyncIf(true, async (results) => {
  // custom async builder logic
});
```

### `withResource`
#### Purpose:
Adds a custom resource function.

#### Sample Usage:
```typescript
resourceBuilder.withResource((results) => {
  // custom resource logic
});
```

### `lock`
#### Purpose:
Enables or disables locking of the resource group.

#### Sample Usage:
```typescript
resourceBuilder.lock(true);
```

### `build`
#### Purpose:
Builds the configured resources and returns the results.

#### Sample Usage:
```typescript
const results = await resourceBuilder.build();
console.log(results);
```

### Full Example
Here is a full example demonstrating how to use the `ResourceBuilder` class:

```typescript
import ResourceBuilder from './Builder/ResourceBuilder';
import { ResourceGroupInfo, KeyVaultInfo } from '../types';

const resourceBuilder = new ResourceBuilder('myResource');

resourceBuilder
  .createRoles()
  .withRoles({
    // EnvRolesInfo properties
  })
  .createEnvUID()
  .withEnvUIDFromVault()
  .withRolesFromVault()
  .createRG({
    enableRGRoles: { readOnly: true },
    enableVaultRoles: true,
  })
  .withRG({
    resourceGroupName: 'myResourceGroup',
    location: 'West US',
  })
  .createVault('myKeyVault')
  .withVault({
    // KeyVaultInfo properties
  })
  .withVaultFrom('myKeyVault')
  .linkVaultTo({
    asPrivateLink: true,
    subnetNames: ['subnet1', 'subnet2'],
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  })
  .addSecrets({
    secretName: pulumi.secret('secretValue'),
  })
  .addCerts({
    name: 'certName',
    // other CertBuilderType properties
  })
  .withVnet({
    // ResourceVnetBuilderType properties
  })
  .enableEncryption(true)
  .withLogFrom('logName')
  .withBuilder((results) => {
    // custom builder logic
  })
  .withBuilderIf(true, (results) => {
    // custom builder logic
  })
  .withBuilderAsync(async (results) => {
    // custom async builder logic
  })
  .withBuilderAsyncIf(true, async (results) => {
    // custom async builder logic
  })
  .withResource((results) => {
    // custom resource logic
  })
  .lock(true);

const results = await resourceBuilder.build();
console.log(results);
```

### Summary
- **Constructor**: Initializes the builder with a name.
- **createRoles**: Enables role creation.
- **withRoles**: Sets environment roles.
- **createEnvUID**: Enables User Assigned Identity creation.
- **withEnvUIDFromVault**: Loads User Assigned Identity from vault.
- **withRolesFromVault**: Loads roles from vault.
- **createRG**: Enables resource group creation.
- **withRG**: Sets resource group information.
- **createVault**: Enables Key Vault creation.
- **withVault**: Sets Key Vault information.
- **withVaultFrom**: Loads Key Vault information from a name.
- **linkVaultTo**: Links Key Vault to network properties.
- **addSecrets**: Adds secrets to Key Vault.
- **addCerts**: Adds certificates to Key Vault.
- **withVnet**: Sets virtual network properties.
- **enableEncryption**: Enables or disables encryption.
- **withLogFrom**: Loads log information from a name.
- **withBuilder**: Adds a custom builder function.
- **withBuilderIf**: Conditionally adds a custom builder function.
- **withBuilderAsync**: Adds an asynchronous custom builder function.
- **withBuilderAsyncIf**: Conditionally adds an asynchronous custom builder function.
- **withResource**: Adds a custom resource function.
- **lock**: Enables or disables locking of the resource group.
- **build**: Builds the configured resources and returns the results.

This guideline should help developers understand and reuse the methods in the `ResourceBuilder` class effectively.