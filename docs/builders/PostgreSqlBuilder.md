# Class: `PostgreSqlBuilder`

#### Constructor
**Purpose**: Initializes the `PostgreSqlBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = PostgreSqlBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});
```







#### Method: `withSku`
**Purpose**: Sets the SKU for the PostgreSQL server.

**Usage**:
```typescript
builder.withSku({
  version: '12',
  sku: {
    name: 'B_Gen5_1',
    tier: 'Basic',
    capacity: 1,
  },
});
```







#### Method: `withLogin`
**Purpose**: Sets the login credentials for the PostgreSQL server.

**Usage**:
```typescript
builder.withLogin({
  adminLogin: 'adminUser',
  password: 'securePassword',
});
```







#### Method: `generateLogin`
**Purpose**: Generates random login credentials for the PostgreSQL server.

**Usage**:
```typescript
builder.generateLogin();
```







#### Method: `withNetwork`
**Purpose**: Sets the network configuration for the PostgreSQL server.

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
**Purpose**: Sets additional options for the PostgreSQL server, including its authentication configuration.

**Usage**:
```typescript
builder.withOptions({
  storageSizeGB: 256,
  maintenanceWindow: {
    dayOfWeek: 0,
    startHour: 2,
    startMinute: 0,
  },
  authConfig: {
    passwordAuth: 'Enabled',
    activeDirectoryAuth: 'Enabled',
  },
});
```

See [Authentication](#authentication) for the `authConfig` fields, their defaults, and the Entra administrator they create.







#### Method: `withDatabases`
**Purpose**: Adds databases to the PostgreSQL server.

**Usage**:
```typescript
builder.withDatabases('db1', 'db2');
```







#### Method: `lock`
**Purpose**: Enables or disables the deletion guard on the PostgreSQL server.

- Defaults to `isPrd` — production stacks are guarded without the caller asking for it; other environments are not.
- When enabled, the server is created with Pulumi `protect: true` **and** an Azure `CanNotDelete` management lock. Without the guard, dropping the builder call from a stack — or a rename that turns the diff into a delete-then-create — destroys the server and its data.
- `.lock(false)` opts out explicitly, including in production.
- Once the guard is on, deleting the server deliberately requires `pulumi state unprotect` and removing the Azure lock first. That is the guard doing its job, not a bug.

**Usage**:
```typescript
builder.lock(); // guard the server explicitly
builder.lock(false); // opt out, even in a production stack
```







#### Method: `build`
**Purpose**: Builds the entire PostgreSQL server resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Example Usage
Here is a complete example that demonstrates how to use the `PostgreSqlBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = PostgreSqlBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});

builder
  .withSku({
    version: '12',
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
  .withDatabases('db1', 'db2')
  .lock();

const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Authentication

The PostgreSQL Flexible Server accepts password authentication, Microsoft Entra ID (Azure AD) authentication, or both. It is configured with the `authConfig` option of `withOptions` — there is no dedicated chain method for it.

| Field | Type | Default | Effect |
|---|---|---|---|
| `passwordAuth` | `'Enabled' \| 'Disabled'` | `'Enabled'` | When `'Disabled'`, the server is created without `administratorLogin` / `administratorLoginPassword`, so the admin username and password cannot be used to connect. |
| `activeDirectoryAuth` | `'Enabled' \| 'Disabled'` | `'Enabled'` when `envRoles` is supplied to the builder, otherwise `'Disabled'` | When it is `'Enabled'` and `envRoles` is supplied, the `admin` env-role group is created as the server's Entra administrator. |

**The Entra administrator**: promoting a group requires `envRoles` on the builder arguments — that is where the `admin` group comes from. The group is registered as an Entra administrator of type `Group`, using the `admin` role's object id and display name. Without `envRoles` there is no group to promote, which is why `activeDirectoryAuth` defaults to `'Disabled'` in that case; setting it to `'Enabled'` without `envRoles` still turns Entra authentication on at the server, but no administrator is created.

**Usage**: an Entra-only server, with no usable shared admin password. Only the `authConfig` option differs from the full chain in [Example Usage](#example-usage) above:

```typescript
PostgreSqlBuilder({ name: 'example', group, vaultInfo, envRoles, dependsOn: [] })
  .withSku(sku)
  .generateLogin()
  .withOptions({
    storageSizeGB: 256,
    authConfig: {
      passwordAuth: 'Disabled',
      activeDirectoryAuth: 'Enabled',
    },
  })
  .withDatabases('db1')
  .build();
```

The login stage of the chain stays mandatory: `withSku` returns the login builder, so `withLogin` or `generateLogin` must still be called before `withOptions` even when `passwordAuth` is `'Disabled'`. The generated username and password are also still written to the key vault as the `<server>-username` and `<server>-pass` secrets — with `passwordAuth: 'Disabled'` they are simply never registered on the server.

**Backwards compatibility**: omitting `authConfig` keeps password authentication working exactly as before. The one behavioural change is that a builder already supplying `envRoles` now also gets Entra authentication and an `admin` Entra administrator; pass `authConfig: { activeDirectoryAuth: 'Disabled' }` to keep the previous password-only server.

### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `PostgreSqlBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = PostgreSqlBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});
```







#### Method: `withSku`
**Purpose**: Sets the SKU for the PostgreSQL server.

**Usage**:
```typescript
builder.withSku({
  version: '12',
  sku: {
    name: 'B_Gen5_1',
    tier: 'Basic',
    capacity: 1,
  },
});
```







#### Method: `withLogin`
**Purpose**: Sets the login credentials for the PostgreSQL server.

**Usage**:
```typescript
builder.withLogin({
  adminLogin: 'adminUser',
  password: 'securePassword',
});
```







#### Method: `generateLogin`
**Purpose**: Generates random login credentials for the PostgreSQL server.

**Usage**:
```typescript
builder.generateLogin();
```







#### Method: `withNetwork`
**Purpose**: Sets the network configuration for the PostgreSQL server.

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
**Purpose**: Sets additional options for the PostgreSQL server, including its authentication configuration.

**Usage**:
```typescript
builder.withOptions({
  storageSizeGB: 256,
  maintenanceWindow: {
    dayOfWeek: 0,
    startHour: 2,
    startMinute: 0,
  },
  authConfig: {
    passwordAuth: 'Enabled',
    activeDirectoryAuth: 'Enabled',
  },
});
```

See [Authentication](#authentication) for the `authConfig` fields, their defaults, and the Entra administrator they create.







#### Method: `withDatabases`
**Purpose**: Adds databases to the PostgreSQL server.

**Usage**:
```typescript
builder.withDatabases('db1', 'db2');
```







#### Method: `lock`
**Purpose**: Enables or disables the deletion guard on the PostgreSQL server.

- Defaults to `isPrd` — production stacks are guarded without the caller asking for it; other environments are not.
- When enabled, the server is created with Pulumi `protect: true` **and** an Azure `CanNotDelete` management lock. Without the guard, dropping the builder call from a stack — or a rename that turns the diff into a delete-then-create — destroys the server and its data.
- `.lock(false)` opts out explicitly, including in production.
- Once the guard is on, deleting the server deliberately requires `pulumi state unprotect` and removing the Azure lock first. That is the guard doing its job, not a bug.

**Usage**:
```typescript
builder.lock(); // guard the server explicitly
builder.lock(false); // opt out, even in a production stack
```







#### Method: `build`
**Purpose**: Builds the entire PostgreSQL server resource with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```







### Example Usage
Here is a complete example that demonstrates how to use the `PostgreSqlBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = PostgreSqlBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { id: 'vaultId' },
  envUIDInfo: { id: 'userAssignedIdentityId', clientId: 'clientId' },
  enableEncryption: true,
  dependsOn: [],
});

builder
  .withSku({
    version: '12',
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
  .withDatabases('db1', 'db2')
  .lock();

const resourceInfo = builder.build();
console.log(resourceInfo);
```







This example demonstrates how to create a `PostgreSqlBuilder` instance, configure it with various settings, and finally build the PostgreSQL server resource. The `build()` method is called last to ensure the resource is fully constructed.