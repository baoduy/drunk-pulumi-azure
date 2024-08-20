# `RedisCacheBuilder` Class Overview

The `RedisCacheBuilder` class is designed to build and configure an Azure Redis Cache instance with specific configurations such as SKU, network settings, and secrets management.

### Constructor
#### Purpose:
Initializes the `RedisCacheBuilder` with the provided arguments and sets the instance name.

#### Sample Usage:
```typescript
const redisBuilder = new RedisCacheBuilder({
  name: 'myRedisCache',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```

### `withSku`
#### Purpose:
Sets the SKU properties for the Redis Cache.

#### Sample Usage:
```typescript
redisBuilder.withSku({
  name: 'Premium',
  family: 'P',
  capacity: 1,
});
```

### `withNetwork`
#### Purpose:
Sets the network properties for the Redis Cache, including subnet ID and private link settings.

#### Sample Usage:
```typescript
redisBuilder.withNetwork({
  subnetId: 'subnet-id',
  privateLink: {
    // private link properties
  },
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```

### `buildRedis`
#### Purpose:
Creates the Redis Cache instance with the specified configurations.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildNetwork`
#### Purpose:
Configures network settings for the Redis Cache, including firewall rules and private link.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildSecrets`
#### Purpose:
Stores Redis Cache connection details in Azure Key Vault.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `build`
#### Purpose:
Builds the Redis Cache instance, configures network settings, and stores secrets.

#### Sample Usage:
```typescript
const resourceInfo = redisBuilder.build();
console.log(resourceInfo);
```

### Full Example
Here is a full example demonstrating how to use the `RedisCacheBuilder` class:

```typescript
import RedisCacheBuilder from './Builder/RedisCacheBuilder';
import { RedisCacheBuilderArgs } from './types';

const args: RedisCacheBuilderArgs = {
  name: 'myRedisCache',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const redisBuilder = new RedisCacheBuilder(args);

redisBuilder
  .withSku({
    name: 'Premium',
    family: 'P',
    capacity: 1,
  })
  .withNetwork({
    subnetId: 'subnet-id',
    privateLink: {
      // private link properties
    },
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  });

const resourceInfo = redisBuilder.build();
console.log(resourceInfo);
```

### Summary
- **Constructor**: Initializes the builder with necessary arguments.
- **withSku**: Configures the SKU for the Redis Cache.
- **withNetwork**: Configures network settings for the Redis Cache.
- **buildRedis**: Internally creates the Redis Cache instance.
- **buildNetwork**: Internally configures network settings.
- **buildSecrets**: Internally stores connection details in Key Vault.
- **build**: Executes the build process and returns resource information.

This guideline should help developers understand and reuse the methods in the `RedisCacheBuilder` class effectively.