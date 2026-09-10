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

#### Blob data-protection defaults

A `storage.BlobServiceProperties` resource (blob service `default`) is created for **every** storage account this builder makes — it is no longer created only when you pass `policies.blobProperties`. It turns on soft delete for both blobs and containers so an accidental delete is recoverable.

| Setting | Non-production default | Production default |
|---|---|---|
| `deleteRetentionPolicy.enabled` (blobs) | `true` | `true` |
| `deleteRetentionPolicy.days` | `1` | `7` |
| `containerDeleteRetentionPolicy.enabled` | `true` | `true` |
| `containerDeleteRetentionPolicy.days` | `1` | `7` |
| `isVersioningEnabled` | `false` | `false` |

"Production" is the library-wide `isPrd` flag — true when the Pulumi stack name contains `prd` (`src/Common/AzureEnv/index.ts`). No other environment gets the 7-day retention.

**Blob versioning is off by default on purpose.** The builder hard-codes `isHnsEnabled: true` on the storage account (Data Lake Gen2 hierarchical namespace), and Azure does not support blob versioning on hierarchical-namespace accounts — enabling it is rejected at deployment time. Only opt in when you know versioning is valid for the account you are building.

Everything you pass in `policies.blobProperties` is applied **after** the defaults, so any field you set wins field-by-field while the ones you omit keep the default above:

```typescript
storageBuilder.withPolicies({
  blobProperties: {
    // keeps container soft delete at the default, overrides blob soft delete only
    deleteRetentionPolicy: { enabled: true, days: 30 },
  },
});
```

> **Upgrading an existing stack:** the first `pulumi up` after taking this version will show a new `BlobServiceProperties` resource being created for every storage account, including accounts that never configured `blobProperties`. This is expected — it is a create, not a replacement of the storage account.

#### Deprecated: `policies.isBlobVersioningEnabled`

`StoragePolicyType.isBlobVersioningEnabled` was declared but never read, so setting it had no effect. It is now honoured, and deprecated at the same time — it will be removed in the next major. Move to `blobProperties.isVersioningEnabled`, which is applied last and therefore wins over the old flag:

```typescript
// before — silently did nothing
storageBuilder.withPolicies({ isBlobVersioningEnabled: true });

// after
storageBuilder.withPolicies({
  blobProperties: { isVersioningEnabled: true },
});
```

If you were relying on the old flag, note that it now actually reaches Azure — read the hierarchical-namespace limitation above before keeping it on.



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