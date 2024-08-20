# `VaultBuilder` Class Overview

The `VaultBuilder` class is designed to build and configure an Azure Key Vault instance with specific configurations such as secrets, certificates, and network settings.

### `VaultBuilderResults` Class Overview
The `VaultBuilderResults` class encapsulates the results of building a Key Vault, providing methods to access the vault's information and perform additional configurations.

### `VaultBuilderResults` Class

#### Constructor
#### Purpose:
Initializes the `VaultBuilderResults` with the provided Key Vault information.

#### Sample Usage:
This constructor is private and is called internally by the `from` method.

#### `from`
#### Purpose:
Creates an instance of `VaultBuilderResults` from the provided Key Vault information.

#### Sample Usage:
```typescript
const vaultInfo: KeyVaultInfo = {
  name: 'myKeyVault',
  id: 'vault-id',
  group: { resourceGroupName: 'myResourceGroup' },
};

const vaultResults = VaultBuilderResults.from(vaultInfo);
```



#### `name`
#### Purpose:
Gets the name of the Key Vault.

#### Sample Usage:
```typescript
const vaultName = vaultResults.name;
```



#### `group`
#### Purpose:
Gets the resource group information of the Key Vault.

#### Sample Usage:
```typescript
const resourceGroup = vaultResults.group;
```



#### `id`
#### Purpose:
Gets the ID of the Key Vault.

#### Sample Usage:
```typescript
const vaultId = vaultResults.id;
```



#### `info`
#### Purpose:
Gets the Key Vault information.

#### Sample Usage:
```typescript
const vaultInfo = vaultResults.info();
```



#### `linkTo`
#### Purpose:
Links the Key Vault to specified subnets and IP addresses.

#### Sample Usage:
```typescript
vaultResults.linkTo({
  subnetIds: ['subnet-id-1', 'subnet-id-2'],
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```



#### `privateLinkTo`
#### Purpose:
Creates a private link to the Key Vault for specified subnets.

#### Sample Usage:
```typescript
vaultResults.privateLinkTo(['subnet-id-1', 'subnet-id-2']);
```



#### `addSecrets`
#### Purpose:
Adds secrets to the Key Vault.

#### Sample Usage:
```typescript
vaultResults.addSecrets({
  secretName: pulumi.secret('secretValue'),
});
```



#### `addCerts`
#### Purpose:
Adds certificates to the Key Vault.

#### Sample Usage:
```typescript
vaultResults.addCerts({
  certName: {
    name: 'certName',
    // other CertBuilderType properties
  },
});
```



### `VaultBuilder` Class

#### Constructor
#### Purpose:
Initializes the `VaultBuilder` with the provided arguments.

#### Sample Usage:
```typescript
const vaultBuilder = new VaultBuilder({
  name: 'myKeyVault',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```



#### `build`
#### Purpose:
Builds the Key Vault and returns the results.

#### Sample Usage:
```typescript
const vaultResults = vaultBuilder.build();
console.log(vaultResults);
```



### Full Example
Here is a full example demonstrating how to use the `VaultBuilder` class:

```typescript
import VaultBuilder from './Builder/VaultBuilder';
import { VaultBuilderArgs } from './types/vaultBuilder';

const args: VaultBuilderArgs = {
  name: 'myKeyVault',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const vaultBuilder = new VaultBuilder(args);

const vaultResults = vaultBuilder.build();

vaultResults
  .addSecrets({
    secretName: pulumi.secret('secretValue'),
  })
  .addCerts({
    certName: {
      name: 'certName',
      // other CertBuilderType properties
    },
  })
  .linkTo({
    subnetIds: ['subnet-id-1', 'subnet-id-2'],
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  })
  .privateLinkTo(['subnet-id-1', 'subnet-id-2']);

console.log(vaultResults);
```



### Summary
- **VaultBuilderResults**
  - **Constructor**: Initializes with Key Vault information.
  - **from**: Creates an instance from Key Vault information.
  - **name**: Gets the Key Vault name.
  - **group**: Gets the resource group information.
  - **id**: Gets the Key Vault ID.
  - **info**: Gets the Key Vault information.
  - **linkTo**: Links the Key Vault to subnets and IP addresses.
  - **privateLinkTo**: Creates a private link to the Key Vault.
  - **addSecrets**: Adds secrets to the Key Vault.
  - **addCerts**: Adds certificates to the Key Vault.

- **VaultBuilder**
  - **Constructor**: Initializes the builder with necessary arguments.
  - **build**: Builds the Key Vault and returns the results.

This guideline should help developers understand and reuse the methods in the `VaultBuilder` class effectively.