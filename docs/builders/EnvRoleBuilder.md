# Class: `EnvRoleBuilder`

#### Constructor
**Purpose**: Initializes the `EnvRoleBuilder` with the provided arguments and sets up the initial state. This constructor is private and is used internally by the static methods.

**Usage**:
The constructor is not called directly. Use the static methods (`form`, `loadForm`, `create`) to create an instance of `EnvRoleBuilder`.

#### Method: `addMember`
**Purpose**: Adds a member to the specified role.

**Usage**:
```typescript
builder.addMember('contributor', 'memberId');
```





#### Method: `addIdentity`
**Purpose**: Adds an identity to the specified role.

**Usage**:
```typescript
builder.addIdentity('contributor', someIdentityOutput);
```





#### Method: `pushTo`
**Purpose**: Pushes the environment roles to the specified Key Vault.

**Usage**:
```typescript
builder.pushTo({
  id: 'vaultId',
  name: 'vaultName',
  resourceGroupName: 'resourceGroup',
});
```





#### Method: `grant`
**Purpose**: Grants permissions to the environment roles.

**Usage**:
```typescript
builder.grant({
  name: 'resourceName',
  scope: 'resourceScope',
  permissions: { readOnly: true },
});
```





#### Method: `info`
**Purpose**: Returns the environment roles information.

**Usage**:
```typescript
const rolesInfo = builder.info();
console.log(rolesInfo);
```





#### Static Method: `form`
**Purpose**: Creates an `EnvRoleBuilder` instance from the provided roles.

**Usage**:
```typescript
const builder = EnvRoleBuilder.form({
  readOnly: { objectId: 'readOnlyId' },
  contributor: { objectId: 'contributorId' },
  admin: { objectId: 'adminId' },
});
```





#### Static Method: `loadForm`
**Purpose**: Loads an `EnvRoleBuilder` instance from the specified Key Vault.

**Usage**:
```typescript
const builder = EnvRoleBuilder.loadForm({
  id: 'vaultId',
  name: 'vaultName',
  resourceGroupName: 'resourceGroup',
});
```





#### Static Method: `create`
**Purpose**: Creates a new `EnvRoleBuilder` instance with default roles.

**Usage**:
```typescript
const builder = EnvRoleBuilder.create();
```





### Example Usage
Here is a complete example that demonstrates how to use the `EnvRoleBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = EnvRoleBuilder.create();

builder
  .addMember('contributor', 'memberId')
  .addIdentity('contributor', someIdentityOutput)
  .pushTo({
    id: 'vaultId',
    name: 'vaultName',
    resourceGroupName: 'resourceGroup',
  })
  .grant({
    name: 'resourceName',
    scope: 'resourceScope',
    permissions: { readOnly: true },
  });

const rolesInfo = builder.info();
console.log(rolesInfo);
```





### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `EnvRoleBuilder` with the provided arguments and sets up the initial state. This constructor is private and is used internally by the static methods.

**Usage**:
The constructor is not called directly. Use the static methods (`form`, `loadForm`, `create`) to create an instance of `EnvRoleBuilder`.

#### Method: `addMember`
**Purpose**: Adds a member to the specified role.

**Usage**:
```typescript
builder.addMember('contributor', 'memberId');
```





#### Method: `addIdentity`
**Purpose**: Adds an identity to the specified role.

**Usage**:
```typescript
builder.addIdentity('contributor', someIdentityOutput);
```





#### Method: `pushTo`
**Purpose**: Pushes the environment roles to the specified Key Vault.

**Usage**:
```typescript
builder.pushTo({
  id: 'vaultId',
  name: 'vaultName',
  resourceGroupName: 'resourceGroup',
});
```





#### Method: `grant`
**Purpose**: Grants permissions to the environment roles.

**Usage**:
```typescript
builder.grant({
  name: 'resourceName',
  scope: 'resourceScope',
  permissions: { readOnly: true },
});
```





#### Method: `info`
**Purpose**: Returns the environment roles information.

**Usage**:
```typescript
const rolesInfo = builder.info();
console.log(rolesInfo);
```





#### Static Method: `form`
**Purpose**: Creates an `EnvRoleBuilder` instance from the provided roles.

**Usage**:
```typescript
const builder = EnvRoleBuilder.form({
  readOnly: { objectId: 'readOnlyId' },
  contributor: { objectId: 'contributorId' },
  admin: { objectId: 'adminId' },
});
```





#### Static Method: `loadForm`
**Purpose**: Loads an `EnvRoleBuilder` instance from the specified Key Vault.

**Usage**:
```typescript
const builder = EnvRoleBuilder.loadForm({
  id: 'vaultId',
  name: 'vaultName',
  resourceGroupName: 'resourceGroup',
});
```





#### Static Method: `create`
**Purpose**: Creates a new `EnvRoleBuilder` instance with default roles.

**Usage**:
```typescript
const builder = EnvRoleBuilder.create();
```





### Example Usage
Here is a complete example that demonstrates how to use the `EnvRoleBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = EnvRoleBuilder.create();

builder
  .addMember('contributor', 'memberId')
  .addIdentity('contributor', someIdentityOutput)
  .pushTo({
    id: 'vaultId',
    name: 'vaultName',
    resourceGroupName: 'resourceGroup',
  })
  .grant({
    name: 'resourceName',
    scope: 'resourceScope',
    permissions: { readOnly: true },
  });

const rolesInfo = builder.info();
console.log(rolesInfo);
```





This example demonstrates how to create an `EnvRoleBuilder` instance, configure it with various settings, and finally retrieve the environment roles information. The `info()` method is called last to ensure the roles information is fully constructed.