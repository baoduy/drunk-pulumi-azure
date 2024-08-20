# `VdiBuilder` Class Overview

The `VdiBuilder` class is designed to build and configure an Azure Virtual Desktop (VDI) instance with specific configurations such as application groups, options, and network settings.

### Constructor
#### Purpose:
Initializes the `VdiBuilder` with the provided arguments and sets the host pool name.

#### Sample Usage:
```typescript
const vdiBuilder = new VdiBuilder({
  name: 'myVdiInstance',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```



### `withAppGroup`
#### Purpose:
Adds an application group to the VDI instance.

#### Sample Usage:
```typescript
vdiBuilder.withAppGroup({
  applicationGroupType: 'Desktop',
  // other VdiBuilderAppGroupType properties
});
```



### `withOptions`
#### Purpose:
Sets additional options for the VDI instance.

#### Sample Usage:
```typescript
vdiBuilder.withOptions({
  sku: 'Standard',
  plan: 'Basic',
  // other VdiBuilderOptionsType properties
});
```



### `withNetwork`
#### Purpose:
Sets the network properties for the VDI instance.

#### Sample Usage:
```typescript
vdiBuilder.withNetwork({
  subnetId: 'subnet-id',
  // other VdiBuilderNetworkType properties
});
```



### `buildHost`
#### Purpose:
Creates the host pool for the VDI instance with the specified configurations.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildAppGroups`
#### Purpose:
Creates the application groups for the VDI instance.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `build`
#### Purpose:
Builds the VDI instance, including the host pool and application groups, and returns the resource information.

#### Sample Usage:
```typescript
const resourceInfo = vdiBuilder.build();
console.log(resourceInfo);
```



### Full Example
Here is a full example demonstrating how to use the `VdiBuilder` class:

```typescript
import VdiBuilder from './Builder/VdiBuilder';
import { BuilderProps } from './types';

const props: BuilderProps = {
  name: 'myVdiInstance',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const vdiBuilder = new VdiBuilder(props);

vdiBuilder
  .withAppGroup({
    applicationGroupType: 'Desktop',
    // other VdiBuilderAppGroupType properties
  })
  .withOptions({
    sku: 'Standard',
    plan: 'Basic',
    // other VdiBuilderOptionsType properties
  })
  .withNetwork({
    subnetId: 'subnet-id',
    // other VdiBuilderNetworkType properties
  });

const resourceInfo = vdiBuilder.build();
console.log(resourceInfo);
```



### Summary
- **Constructor**: Initializes the builder with necessary arguments.
- **withAppGroup**: Adds an application group to the VDI instance.
- **withOptions**: Sets additional options for the VDI instance.
- **withNetwork**: Configures the network properties for the VDI instance.
- **buildHost**: Internally creates the host pool for the VDI instance.
- **buildAppGroups**: Internally creates the application groups for the VDI instance.
- **build**: Executes the build process and returns the resource information.

This guideline should help developers understand and reuse the methods in the `VdiBuilder` class effectively.