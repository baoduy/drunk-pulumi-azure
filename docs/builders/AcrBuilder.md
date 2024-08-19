# AcrBuilder Usage Guide

## Overview

The `AcrBuilder` class provides a fluent API for creating and configuring Azure Container Registry (ACR) resources. It implements the Builder pattern, allowing developers to set various properties such as SKU, network settings, and policies in a chainable manner.

## Installation

Ensure you have the necessary dependencies installed:

```bash
npm install @pulumi/azure-native
```

## Importing AcrBuilder

First, import the necessary modules and the `AcrBuilder` class:

```typescript
import AcrBuilder from './Builder/AcrBuilder';
import { AcrBuilderArgs } from './Builder/types';
```

## Creating an AcrBuilder Instance

To create an instance of `AcrBuilder`, you need to provide the required arguments (`AcrBuilderArgs`):

```typescript
const acrArgs: AcrBuilderArgs = {
  name: 'myAcr',
  group: { resourceGroupName: 'myResourceGroup' },
  enableEncryption: true,
  envUIDInfo: { id: 'myEnvUID', clientId: 'myClientId' },
  vaultInfo: { vaultName: 'myKeyVault', keyName: 'myKey' },
  dependsOn: [],
  ignoreChanges: [],
};

const acrBuilder = new AcrBuilder(acrArgs);
```

## Configuring the ACR

### Setting the SKU

You can set the SKU for the ACR using the `withSku` method:

```typescript
acrBuilder.withSku('Premium');
```

### Setting Network Configuration

To set the network configuration, use the `withNetwork` method. This is only available for the Premium SKU:

```typescript
acrBuilder.withNetwork({
  privateLink: {
    type: 'Microsoft.ContainerRegistry/registries',
    subnetId: 'mySubnetId',
  },
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
});
```

### Setting Policies

To set the policies for the ACR, use the `withPolicy` method. This is also only available for the Premium SKU:

```typescript
acrBuilder.withPolicy({ retentionDay: 30 });
```

## Building the ACR

Finally, build the ACR resource and get the resource information:

```typescript
const acrResourceInfo = acrBuilder.build();
console.log(acrResourceInfo);
```

## Full Example

Here is a complete example demonstrating the usage of `AcrBuilder`:

```typescript
import AcrBuilder from './Builder/AcrBuilder';
import { AcrBuilderArgs } from './Builder/types';

const acrArgs: AcrBuilderArgs = {
  name: 'myAcr',
  group: { resourceGroupName: 'myResourceGroup' },
  enableEncryption: true,
  envUIDInfo: { id: 'myEnvUID', clientId: 'myClientId' },
  vaultInfo: { vaultName: 'myKeyVault', keyName: 'myKey' },
  dependsOn: [],
  ignoreChanges: [],
};

const acrBuilder = new AcrBuilder(acrArgs)
  .withSku('Premium')
  .withNetwork({
    privateLink: {
      type: 'Microsoft.ContainerRegistry/registries',
      subnetId: 'mySubnetId',
    },
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
  })
  .withPolicy({ retentionDay: 30 });

const acrResourceInfo = acrBuilder.build();
console.log(acrResourceInfo);
```

## Conclusion

The `AcrBuilder` class simplifies the process of creating and configuring Azure Container Registry resources by providing a fluent API. By following the steps outlined in this guide, developers can easily set up ACR with the desired configurations.

For more details, refer to the source code and documentation of the `AcrBuilder` class and its related types.