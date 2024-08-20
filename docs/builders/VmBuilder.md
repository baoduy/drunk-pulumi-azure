# `VmBuilder` Class Overview

The `VmBuilder` class is designed to build and configure an Azure Virtual Machine (VM) instance with specific configurations such as OS, size, login, network settings, encryption, and scheduling.

### Constructor
#### Purpose:
Initializes the `VmBuilder` with the provided arguments.

#### Sample Usage:
```typescript
const vmBuilder = new VmBuilder({
  name: 'myVmInstance',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```



### `enableEncryption`
#### Purpose:
Enables encryption for the VM with the specified properties.

#### Sample Usage:
```typescript
vmBuilder.enableEncryption({
  diskEncryptionSetId: 'encryption-set-id',
});
```



### `withSchedule`
#### Purpose:
Sets the schedule for the VM.

#### Sample Usage:
```typescript
vmBuilder.withSchedule({
  startOn: '2023-01-01T00:00:00Z',
  stopOn: '2023-01-01T12:00:00Z',
});
```



### `withSubnetId`
#### Purpose:
Sets the subnet ID for the VM.

#### Sample Usage:
```typescript
vmBuilder.withSubnetId('subnet-id');
```



### `withTags`
#### Purpose:
Sets the tags for the VM.

#### Sample Usage:
```typescript
vmBuilder.withTags({
  environment: 'production',
  project: 'myProject',
});
```



### `generateLogin`
#### Purpose:
Enables the generation of a random login for the VM.

#### Sample Usage:
```typescript
vmBuilder.generateLogin();
```



### `withLoginInfo`
#### Purpose:
Sets the login information for the VM.

#### Sample Usage:
```typescript
vmBuilder.withLoginInfo({
  adminLogin: 'adminUser',
  password: 'securePassword',
});
```



### `withSize`
#### Purpose:
Sets the size of the VM.

#### Sample Usage:
```typescript
vmBuilder.withSize('Standard_DS1_v2');
```



### `withWindowsImage`
#### Purpose:
Sets the Windows image for the VM.

#### Sample Usage:
```typescript
vmBuilder.withWindowsImage({
  publisher: 'MicrosoftWindowsServer',
  offer: 'WindowsServer',
  sku: '2019-Datacenter',
  version: 'latest',
});
```



### `withLinuxImage`
#### Purpose:
Sets the Linux image for the VM.

#### Sample Usage:
```typescript
vmBuilder.withLinuxImage({
  publisher: 'Canonical',
  offer: 'UbuntuServer',
  sku: '18.04-LTS',
  version: 'latest',
});
```



### `ignoreChangesFrom`
#### Purpose:
Specifies properties to ignore changes for.

#### Sample Usage:
```typescript
vmBuilder.ignoreChangesFrom('property1', 'property2');
```



### `buildLogin`
#### Purpose:
Generates a random login if enabled.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildVm`
#### Purpose:
Creates the VM instance with the specified configurations.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `build`
#### Purpose:
Builds the VM instance and returns the resource information.

#### Sample Usage:
```typescript
const resourceInfo = vmBuilder.build();
console.log(resourceInfo);
```



### Full Example
Here is a full example demonstrating how to use the `VmBuilder` class:

```typescript
import VmBuilder from './Builder/VmBuilder';
import { VmBuilderArgs } from './types';

const args: VmBuilderArgs = {
  name: 'myVmInstance',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const vmBuilder = new VmBuilder(args);

vmBuilder
  .enableEncryption({
    diskEncryptionSetId: 'encryption-set-id',
  })
  .withSchedule({
    startOn: '2023-01-01T00:00:00Z',
    stopOn: '2023-01-01T12:00:00Z',
  })
  .withSubnetId('subnet-id')
  .withTags({
    environment: 'production',
    project: 'myProject',
  })
  .generateLogin()
  .withLoginInfo({
    adminLogin: 'adminUser',
    password: 'securePassword',
  })
  .withSize('Standard_DS1_v2')
  .withWindowsImage({
    publisher: 'MicrosoftWindowsServer',
    offer: 'WindowsServer',
    sku: '2019-Datacenter',
    version: 'latest',
  })
  .ignoreChangesFrom('property1', 'property2');

const resourceInfo = vmBuilder.build();
console.log(resourceInfo);
```



### Summary
- **Constructor**: Initializes the builder with necessary arguments.
- **enableEncryption**: Enables encryption for the VM.
- **withSchedule**: Sets the schedule for the VM.
- **withSubnetId**: Sets the subnet ID for the VM.
- **withTags**: Sets the tags for the VM.
- **generateLogin**: Enables the generation of a random login.
- **withLoginInfo**: Sets the login information.
- **withSize**: Sets the size of the VM.
- **withWindowsImage**: Sets the Windows image for the VM.
- **withLinuxImage**: Sets the Linux image for the VM.
- **ignoreChangesFrom**: Specifies properties to ignore changes for.
- **buildLogin**: Internally generates a random login if enabled.
- **buildVm**: Internally creates the VM instance.
- **build**: Executes the build process and returns the resource information.

This guideline should help developers understand and reuse the methods in the `VmBuilder` class effectively.