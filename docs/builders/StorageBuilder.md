# `StorageBuilder` Class Overview

The `StorageBuilder` class is designed to build and configure an Azure Storage Account with specific configurations such as containers, queues, file shares, CDN, network settings, and policies.

### Constructor
#### Purpose:
Initializes the `StorageBuilder` with the provided arguments.

#### Sample Usage:
```typescript
const storageBuilder = new StorageBuilder({
  name: 'myStorageAccount',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```



### `asStorage`
#### Purpose:
Configures the storage account as a regular storage account with optional features.

#### Sample Usage:
```typescript
storageBuilder.asStorage({
  // StorageFeatureBuilderType properties
});
```



### `asStaticWebStorage`
#### Purpose:
Configures the storage account as a static web storage account.

#### Sample Usage:
```typescript
storageBuilder.asStaticWebStorage();
```



### `withCdn`
#### Purpose:
Sets the CDN properties for the storage account.

#### Sample Usage:
```typescript
storageBuilder.withCdn({
  // StorageCdnType properties
});
```



### `withContainer`
#### Purpose:
Adds a container to the storage account.

#### Sample Usage:
```typescript
storageBuilder.withContainer({
  name: 'myContainer',
  // other ContainerProps properties
});
```



### `withQueue`
#### Purpose:
Adds a queue to the storage account.

#### Sample Usage:
```typescript
storageBuilder.withQueue('myQueue');
```



### `withFileShare`
#### Purpose:
Adds a file share to the storage account.

#### Sample Usage:
```typescript
storageBuilder.withFileShare('myFileShare');
```



### `withPolicies`
#### Purpose:
Sets the policies for the storage account.

#### Sample Usage:
```typescript
storageBuilder.withPolicies({
  // StoragePolicyType properties
});
```



### `withNetwork`
#### Purpose:
Sets the network properties for the storage account.

#### Sample Usage:
```typescript
storageBuilder.withNetwork({
  // StorageNetworkType properties
});
```



### `lock`
#### Purpose:
Enables or disables locking of the storage account.

#### Sample Usage:
```typescript
storageBuilder.lock(true);
```



### `buildStorage`
#### Purpose:
Creates the storage account with the specified configurations.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildCDN`
#### Purpose:
Configures the CDN for the storage account.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `build`
#### Purpose:
Builds the storage account and returns the resource information.

#### Sample Usage:
```typescript
const resourceInfo = storageBuilder.build();
console.log(resourceInfo);
```



### Full Example
Here is a full example demonstrating how to use the `StorageBuilder` class:

```typescript
import StorageBuilder from './Builder/StorageBuilder';
import { StorageBuilderArgs } from './types';

const args: StorageBuilderArgs = {
  name: 'myStorageAccount',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const storageBuilder = new StorageBuilder(args);

storageBuilder
  .asStorage({
    // StorageFeatureBuilderType properties
  })
  .withCdn({
    // StorageCdnType properties
  })
  .withContainer({
    name: 'myContainer',
    // other ContainerProps properties
  })
  .withQueue('myQueue')
  .withFileShare('myFileShare')
  .withPolicies({
    // StoragePolicyType properties
  })
  .withNetwork({
    // StorageNetworkType properties
  })
  .lock(true);

const resourceInfo = storageBuilder.build();
console.log(resourceInfo);
```



### Summary
- **Constructor**: Initializes the builder with necessary arguments.
- **asStorage**: Configures the storage account as a regular storage account.
- **asStaticWebStorage**: Configures the storage account as a static web storage account.
- **withCdn**: Configures the CDN properties for the storage account.
- **withContainer**: Adds a container to the storage account.
- **withQueue**: Adds a queue to the storage account.
- **withFileShare**: Adds a file share to the storage account.
- **withPolicies**: Configures the policies for the storage account.
- **withNetwork**: Configures the network properties for the storage account.
- **lock**: Enables or disables locking of the storage account.
- **buildStorage**: Internally creates the storage account.
- **buildCDN**: Internally configures the CDN.
- **build**: Executes the build process and returns the resource information.

This guideline should help developers understand and reuse the methods in the `StorageBuilder` class effectively.