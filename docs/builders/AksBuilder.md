# Class: `AksBuilder`

#### Constructor
**Purpose**: Initializes the `AksBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AksBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { /* vault info */ },
  envRoles: { /* environment roles info */ },
});
```


#### Method: `withNewSsh`
**Purpose**: Sets the SSH properties for the AKS.

**Usage**:
```typescript
builder.withNewSsh({
  userName: 'adminUser',
  sshKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAr...'
});
```


#### Method: `withNodePool`
**Purpose**: Adds a node pool to the AKS.

**Usage**:
```typescript
builder.withNodePool({
  name: 'nodepool1',
  count: 3,
  vmSize: 'Standard_DS2_v2',
});
```


#### Method: `withAddon`
**Purpose**: Sets the addon properties for the AKS.

**Usage**:
```typescript
builder.withAddon({
  httpApplicationRouting: true,
  monitoring: true,
});
```


#### Method: `withFeature`
**Purpose**: Sets the feature properties for the AKS.

**Usage**:
```typescript
builder.withFeature({
  azurePolicy: true,
  ingressApplicationGateway: true,
});
```


#### Method: `withAuth`
**Purpose**: Sets the authentication properties for the AKS.

**Usage**:
```typescript
builder.withAuth({
  clientId: 'clientId',
  clientSecret: 'clientSecret',
});
```


#### Method: `withTier`
**Purpose**: Sets the tier for the AKS.

**Usage**:
```typescript
builder.withTier(ManagedClusterSKUTier.Paid);
```


#### Method: `withNetwork`
**Purpose**: Sets the network properties for the AKS.

**Usage**:
```typescript
builder.withNetwork({
  vnetSubnetId: 'subnetId',
  dnsServiceIp: '10.0.0.10',
  dockerBridgeCidr: '172.17.0.1/16',
});
```


#### Method: `withDefaultNodePool`
**Purpose**: Sets the default node pool properties for the AKS.

**Usage**:
```typescript
builder.withDefaultNodePool({
  name: 'defaultpool',
  count: 2,
  vmSize: 'Standard_DS2_v2',
});
```


#### Method: `enableEncryption`
**Purpose**: Enables encryption for the AKS.

**Usage**:
```typescript
builder.enableEncryption({
  diskEncryptionSetId: 'diskEncryptionSetId',
});
```


#### Method: `lock`
**Purpose**: Locks the AKS configuration.

**Usage**:
```typescript
builder.lock();
```


#### Method: `import`
**Purpose**: Imports an existing AKS configuration.

**Usage**:
```typescript
builder.import({
  id: 'aksResourceId',
  ignoreChanges: ['agentPoolProfiles'],
});
```


#### Method: `build`
**Purpose**: Builds the entire AKS resource with the configured properties.

**Usage**:
```typescript
const aksResults = await builder.build();
console.log(aksResults);
```


### Example Usage
Here is a complete example that demonstrates how to use the `AksBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new AksBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { /* vault info */ },
  envRoles: { /* environment roles info */ },
});

builder
  .withNewSsh({
    userName: 'adminUser',
    sshKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAr...'
  })
  .withNodePool({
    name: 'nodepool1',
    count: 3,
    vmSize: 'Standard_DS2_v2',
  })
  .withAddon({
    httpApplicationRouting: true,
    monitoring: true,
  })
  .withFeature({
    azurePolicy: true,
    ingressApplicationGateway: true,
  })
  .withAuth({
    clientId: 'clientId',
    clientSecret: 'clientSecret',
  })
  .withTier(ManagedClusterSKUTier.Paid)
  .withNetwork({
    vnetSubnetId: 'subnetId',
    dnsServiceIp: '10.0.0.10',
    dockerBridgeCidr: '172.17.0.1/16',
  })
  .withDefaultNodePool({
    name: 'defaultpool',
    count: 2,
    vmSize: 'Standard_DS2_v2',
  })
  .enableEncryption({
    diskEncryptionSetId: 'diskEncryptionSetId',
  })
  .lock()
  .import({
    id: 'aksResourceId',
    ignoreChanges: ['agentPoolProfiles'],
  });

const aksResults = await builder.build();
console.log(aksResults);
```


### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `AksBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new AksBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  vaultInfo: { /* vault info */ },
  envRoles: { /* environment roles info */ },
});
```


#### Method: `withNewSsh`
**Purpose**: Sets the SSH properties for the AKS.

**Usage**:
```typescript
builder.withNewSsh({
  userName: 'adminUser',
  sshKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAr...'
});
```


#### Method: `withNodePool`
**Purpose**: Adds a node pool to the AKS.

**Usage**:
```typescript
builder.withNodePool({
  name: 'nodepool1',
  count: 3,
  vmSize: 'Standard_DS2_v2',
});
```


#### Method: `withAddon`
**Purpose**: Sets the addon properties for the AKS.

**Usage**:
```typescript
builder.withAddon({
  httpApplicationRouting: true,
  monitoring: true,
});
```


#### Method: `withFeature`
**Purpose**: Sets the feature properties for the AKS.

**Usage**:
```typescript
builder.withFeature({
  azurePolicy: true,
  ingressApplicationGateway: true,
});
```


#### Method: `withAuth`
**Purpose**: Sets the authentication properties for the AKS.

**Usage**:
```typescript
builder.withAuth({
  clientId: 'clientId',
  clientSecret: 'clientSecret',
});
```


#### Method: `withTier`
**Purpose**: Sets the tier for the AKS.

**Usage**:
```typescript
builder.withTier(ManagedClusterSKUTier.Paid);
```


#### Method: `withNetwork`
**Purpose**: Sets the network properties for the AKS.

**Usage**:
```typescript
builder.withNetwork({
  vnetSubnetId: 'subnetId',
  dnsServiceIp: '10.0.0.10',
  dockerBridgeCidr: '172.17.0.1/16',
});
```


#### Method: `withDefaultNodePool`
**Purpose**: Sets the default node pool properties for the AKS.

**Usage**:
```typescript
builder.withDefaultNodePool({
  name: 'defaultpool',
  count: 2,
  vmSize: 'Standard_DS2_v2',
});
```


#### Method: `enableEncryption`
**Purpose**: Enables encryption for the AKS.

**Usage**:
```typescript
builder.enableEncryption({
  diskEncryptionSetId: 'diskEncryptionSetId',
});
```


#### Method: `lock`
**Purpose**: Locks the AKS configuration.

**Usage**:
```typescript
builder.lock();
```


#### Method: `import`
**Purpose**: Imports an existing AKS configuration.

**Usage**:
```typescript
builder.import({
  id: 'aksResourceId',
  ignoreChanges: ['agentPoolProfiles'],
});
```


#### Method: `build`
**Purpose**: Builds the entire AKS resource with the configured properties.

**Usage**:
```typescript
const aksResults = await builder.build();
console.log(aksResults);
```


This example demonstrates how to create an `AksBuilder` instance, configure it with various settings, and finally build the AKS resource. The `build()` method is called last to ensure the resource is fully constructed.