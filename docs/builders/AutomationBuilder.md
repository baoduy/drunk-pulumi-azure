# Class: `AutomationBuilder`

#### Constructor
**Purpose**: Initializes the `AutomationBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AutomationBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envRoles: { /* environment roles info */ },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});
```





#### Method: `withSku`
**Purpose**: Sets the SKU for the Automation Account.

**Usage**:
```typescript
builder.withSku(automation.SkuNameEnum.Basic);
```





#### Method: `build`
**Purpose**: Builds the entire Automation Account resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```





### Example Usage
Here is a complete example that demonstrates how to use the `AutomationBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new AutomationBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envRoles: { /* environment roles info */ },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});

builder.withSku(automation.SkuNameEnum.Basic);

const resourceInfo = builder.build();
console.log(resourceInfo);
```





### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `AutomationBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AutomationBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envRoles: { /* environment roles info */ },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});
```





#### Method: `withSku`
**Purpose**: Sets the SKU for the Automation Account.

**Usage**:
```typescript
builder.withSku(automation.SkuNameEnum.Basic);
```





#### Method: `build`
**Purpose**: Builds the entire Automation Account resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```





### Example Usage
Here is a complete example that demonstrates how to use the `AutomationBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new AutomationBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envRoles: { /* environment roles info */ },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});

builder.withSku(automation.SkuNameEnum.Basic);

const resourceInfo = builder.build();
console.log(resourceInfo);
```





This example demonstrates how to create an `AutomationBuilder` instance, configure it with various settings, and finally build the Automation Account resource. The `build()` method is called last to ensure the resource is fully constructed.