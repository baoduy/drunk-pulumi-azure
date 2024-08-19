# Class: `LogicAppBuilder`

#### Constructor
**Purpose**: Initializes the `LogicAppBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new LogicAppBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
  ignoreChanges: [],
  importUri: 'https://example.com/logicappdefinition.json',
});
```







#### Method: `withSku`
**Purpose**: Sets the SKU for the Logic App.

**Usage**:
```typescript
builder.withSku(logic.IntegrationAccountSkuName.Standard);
```







#### Method: `build`
**Purpose**: Builds the entire Logic App resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Example Usage
Here is a complete example that demonstrates how to use the `LogicAppBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new LogicAppBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
  ignoreChanges: [],
  importUri: 'https://example.com/logicappdefinition.json',
});

builder.withSku(logic.IntegrationAccountSkuName.Standard);

const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `LogicAppBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new LogicAppBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
  ignoreChanges: [],
  importUri: 'https://example.com/logicappdefinition.json',
});
```







#### Method: `withSku`
**Purpose**: Sets the SKU for the Logic App.

**Usage**:
```typescript
builder.withSku(logic.IntegrationAccountSkuName.Standard);
```







#### Method: `build`
**Purpose**: Builds the entire Logic App resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Example Usage
Here is a complete example that demonstrates how to use the `LogicAppBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new LogicAppBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
  ignoreChanges: [],
  importUri: 'https://example.com/logicappdefinition.json',
});

builder.withSku(logic.IntegrationAccountSkuName.Standard);

const resourceInfo = builder.build();
console.log(resourceInfo);
```







This example demonstrates how to create a `LogicAppBuilder` instance, configure it with various settings, and finally build the Logic App resource. The `build()` method is called last to ensure the resource is fully constructed.