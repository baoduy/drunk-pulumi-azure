# Class: `MySqlBuilder`

#### Constructor
**Purpose**: Initializes the `MySqlBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new MySqlBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});
```







#### Method: `withSku`
**Purpose**: Sets the SKU for the MySQL server.

**Usage**:
```typescript
builder.withSku({
  version: '5.7',
  sku: {
    name: 'B_Gen5_1',
    tier: 'Basic',
    capacity: 1,
  },
});
```







#### Method: `withLogin`
**Purpose**: Sets the login credentials for the MySQL server.

**Usage**:
```typescript
builder.withLogin({
  adminLogin: 'adminUser',
  password: 'securePassword',
});
```







#### Method: `generateLogin`
**Purpose**: Generates random login credentials for the MySQL server.

**Usage**:
```typescript
builder.generateLogin();
```







#### Method: `withNetwork`
**Purpose**: Sets the network configuration for the MySQL server.

**Usage**:
```typescript
builder.withNetwork({
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
  allowsPublicAccess: true,
  privateLink: {
    privateEndpointName: 'privateEndpoint',
    privateDnsZoneName: 'privateDnsZone',
  },
});
```







#### Method: `withOptions`
**Purpose**: Sets additional options for the MySQL server.

**Usage**:
```typescript
builder.withOptions({
  storageSizeGB: 256,
  maintenanceWindow: {
    dayOfWeek: 0,
    startHour: 2,
    startMinute: 0,
  },
});
```







#### Method: `withDatabases`
**Purpose**: Adds databases to the MySQL server.

**Usage**:
```typescript
builder.withDatabases('db1', 'db2');
```







#### Method: `build`
**Purpose**: Builds the entire MySQL server resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Example Usage
Here is a complete example that demonstrates how to use the `MySqlBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new MySqlBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});

builder
  .withSku({
    version: '5.7',
    sku: {
      name: 'B_Gen5_1',
      tier: 'Basic',
      capacity: 1,
    },
  })
  .withLogin({
    adminLogin: 'adminUser',
    password: 'securePassword',
  })
  .generateLogin()
  .withNetwork({
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
    allowsPublicAccess: true,
    privateLink: {
      privateEndpointName: 'privateEndpoint',
      privateDnsZoneName: 'privateDnsZone',
    },
  })
  .withOptions({
    storageSizeGB: 256,
    maintenanceWindow: {
      dayOfWeek: 0,
      startHour: 2,
      startMinute: 0,
    },
  })
  .withDatabases('db1', 'db2');

const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `MySqlBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new MySqlBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});
```







#### Method: `withSku`
**Purpose**: Sets the SKU for the MySQL server.

**Usage**:
```typescript
builder.withSku({
  version: '5.7',
  sku: {
    name: 'B_Gen5_1',
    tier: 'Basic',
    capacity: 1,
  },
});
```







#### Method: `withLogin`
**Purpose**: Sets the login credentials for the MySQL server.

**Usage**:
```typescript
builder.withLogin({
  adminLogin: 'adminUser',
  password: 'securePassword',
});
```







#### Method: `generateLogin`
**Purpose**: Generates random login credentials for the MySQL server.

**Usage**:
```typescript
builder.generateLogin();
```







#### Method: `withNetwork`
**Purpose**: Sets the network configuration for the MySQL server.

**Usage**:
```typescript
builder.withNetwork({
  ipAddresses: ['192.168.1.1', '192.168.1.2'],
  allowsPublicAccess: true,
  privateLink: {
    privateEndpointName: 'privateEndpoint',
    privateDnsZoneName: 'privateDnsZone',
  },
});
```







#### Method: `withOptions`
**Purpose**: Sets additional options for the MySQL server.

**Usage**:
```typescript
builder.withOptions({
  storageSizeGB: 256,
  maintenanceWindow: {
    dayOfWeek: 0,
    startHour: 2,
    startMinute: 0,
  },
});
```







#### Method: `withDatabases`
**Purpose**: Adds databases to the MySQL server.

**Usage**:
```typescript
builder.withDatabases('db1', 'db2');
```







#### Method: `build`
**Purpose**: Builds the entire MySQL server resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Example Usage
Here is a complete example that demonstrates how to use the `MySqlBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new MySqlBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});

builder
  .withSku({
    version: '5.7',
    sku: {
      name: 'B_Gen5_1',
      tier: 'Basic',
      capacity: 1,
    },
  })
  .withLogin({
    adminLogin: 'adminUser',
    password: 'securePassword',
  })
  .generateLogin()
  .withNetwork({
    ipAddresses: ['192.168.1.1', '192.168.1.2'],
    allowsPublicAccess: true,
    privateLink: {
      privateEndpointName: 'privateEndpoint',
      privateDnsZoneName: 'privateDnsZone',
    },
  })
  .withOptions({
    storageSizeGB: 256,
    maintenanceWindow: {
      dayOfWeek: 0,
      startHour: 2,
      startMinute: 0,
    },
  })
  .withDatabases('db1', 'db2');

const resourceInfo = builder.build();
console.log(resourceInfo);
```







This example demonstrates how to create a `MySqlBuilder` instance, configure it with various settings, and finally build the MySQL server resource. The `build()` method is called last to ensure the resource is fully constructed.