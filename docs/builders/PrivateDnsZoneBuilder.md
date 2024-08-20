# Class: `PrivateDnsZoneBuilder`

#### Constructor
**Purpose**: Initializes the `PrivateDnsZoneBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new PrivateDnsZoneBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
});
```








#### Method: `linkTo`
**Purpose**: Links the DNS zone to specified virtual networks.

**Usage**:
```typescript
builder.linkTo({
  vnetIds: ['vnetId1', 'vnetId2'],
  subnetIds: ['subnetId1', 'subnetId2'],
});
```








#### Method: `withARecord`
**Purpose**: Adds an A record to the DNS zone.

**Usage**:
```typescript
builder.withARecord({
  recordName: 'www',
  ipAddresses: ['192.168.1.1'],
});
```








#### Method: `build`
**Purpose**: Builds the entire DNS zone and its records with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```








### Example Usage
Here is a complete example that demonstrates how to use the `PrivateDnsZoneBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new PrivateDnsZoneBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
});

builder
  .linkTo({
    vnetIds: ['vnetId1', 'vnetId2'],
    subnetIds: ['subnetId1', 'subnetId2'],
  })
  .withARecord({
    recordName: 'www',
    ipAddresses: ['192.168.1.1'],
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```








### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `PrivateDnsZoneBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new PrivateDnsZoneBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
});
```








#### Method: `linkTo`
**Purpose**: Links the DNS zone to specified virtual networks.

**Usage**:
```typescript
builder.linkTo({
  vnetIds: ['vnetId1', 'vnetId2'],
  subnetIds: ['subnetId1', 'subnetId2'],
});
```








#### Method: `withARecord`
**Purpose**: Adds an A record to the DNS zone.

**Usage**:
```typescript
builder.withARecord({
  recordName: 'www',
  ipAddresses: ['192.168.1.1'],
});
```








#### Method: `build`
**Purpose**: Builds the entire DNS zone and its records with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```








### Example Usage
Here is a complete example that demonstrates how to use the `PrivateDnsZoneBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new PrivateDnsZoneBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
});

builder
  .linkTo({
    vnetIds: ['vnetId1', 'vnetId2'],
    subnetIds: ['subnetId1', 'subnetId2'],
  })
  .withARecord({
    recordName: 'www',
    ipAddresses: ['192.168.1.1'],
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```








This example demonstrates how to create a `PrivateDnsZoneBuilder` instance, configure it with various settings, and finally build the DNS zone and its records. The `build()` method is called last to ensure the resource is fully constructed.