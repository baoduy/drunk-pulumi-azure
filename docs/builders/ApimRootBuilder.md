# Class: `ApimRootBuilder`

#### Constructor
**Purpose**: Initializes the `ApimRootBuilder` with the provided arguments and sets up the initial state. This constructor is private and is used internally by the `from` method.

**Usage**:
The constructor is not called directly. Use the `from` method to create an instance of `ApimRootBuilder`.

#### Method: `from`
**Purpose**: Creates an instance of `ApimRootBuilder` with the provided `apimInfo` and `props`.

**Usage**:
```typescript
const rootBuilder = ApimRootBuilder.from(
  {
    name: 'apimServiceName',
    group: { resourceGroupName: 'resourceGroup' },
  },
  {
    // other properties excluding 'group' and 'name'
  }
);
```



#### Method: `newProduct`
**Purpose**: Creates a new `ApimProductBuilder` instance with the provided product name.

**Usage**:
```typescript
const productBuilder = rootBuilder.newProduct('productName');
```



#### Method: `newWorkspace`
**Purpose**: Creates a new `ApimWorkspaceBuilder` instance with the provided workspace name.

**Usage**:
```typescript
const workspaceBuilder = rootBuilder.newWorkspace('workspaceName');
```



### Example Usage
Here is a complete example that demonstrates how to use the `ApimRootBuilder` class:

```typescript
const rootBuilder = ApimRootBuilder.from(
  {
    name: 'apimServiceName',
    group: { resourceGroupName: 'resourceGroup' },
  },
  {
    // other properties excluding 'group' and 'name'
  }
);

const productBuilder = rootBuilder.newProduct('productName');
const workspaceBuilder = rootBuilder.newWorkspace('workspaceName');
```



### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `ApimRootBuilder` with the provided arguments and sets up the initial state. This constructor is private and is used internally by the `from` method.

**Usage**:
The constructor is not called directly. Use the `from` method to create an instance of `ApimRootBuilder`.

#### Method: `from`
**Purpose**: Creates an instance of `ApimRootBuilder` with the provided `apimInfo` and `props`.

**Usage**:
```typescript
const rootBuilder = ApimRootBuilder.from(
  {
    name: 'apimServiceName',
    group: { resourceGroupName: 'resourceGroup' },
  },
  {
    // other properties excluding 'group' and 'name'
  }
);
```



#### Method: `newProduct`
**Purpose**: Creates a new `ApimProductBuilder` instance with the provided product name.

**Usage**:
```typescript
const productBuilder = rootBuilder.newProduct('productName');
```



#### Method: `newWorkspace`
**Purpose**: Creates a new `ApimWorkspaceBuilder` instance with the provided workspace name.

**Usage**:
```typescript
const workspaceBuilder = rootBuilder.newWorkspace('workspaceName');
```



### Example Usage
Here is a complete example that demonstrates how to use the `ApimRootBuilder` class:

```typescript
const rootBuilder = ApimRootBuilder.from(
  {
    name: 'apimServiceName',
    group: { resourceGroupName: 'resourceGroup' },
  },
  {
    // other properties excluding 'group' and 'name'
  }
);

const productBuilder = rootBuilder.newProduct('productName');
const workspaceBuilder = rootBuilder.newWorkspace('workspaceName');
```



This example demonstrates how to create an `ApimRootBuilder` instance using the `from` method, and then create `ApimProductBuilder` and `ApimWorkspaceBuilder` instances using the `newProduct` and `newWorkspace` methods, respectively.