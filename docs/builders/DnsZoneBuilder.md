# Class: `DnsZoneBuilder`

#### Constructor
**Purpose**: Initializes the `DnsZoneBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new DnsZoneBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
});
```





#### Method: `withSubZone`
**Purpose**: Adds a sub-zone to the DNS zone.

**Usage**:
```typescript
builder.withSubZone('subzoneName');
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
Here is a complete example that demonstrates how to use the `DnsZoneBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new DnsZoneBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
});

builder
  .withSubZone('subzoneName')
  .withARecord({
    recordName: 'www',
    ipAddresses: ['192.168.1.1'],
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```





### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `DnsZoneBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new DnsZoneBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
});
```





#### Method: `withSubZone`
**Purpose**: Adds a sub-zone to the DNS zone.

**Usage**:
```typescript
builder.withSubZone('subzoneName');
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
Here is a complete example that demonstrates how to use the `DnsZoneBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new DnsZoneBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
  dependsOn: [],
});

builder
  .withSubZone('subzoneName')
  .withARecord({
    recordName: 'www',
    ipAddresses: ['192.168.1.1'],
  });

const resourceInfo = builder.build();
console.log(resourceInfo);
```





This example demonstrates how to create a `DnsZoneBuilder` instance, configure it with various settings, and finally build the DNS zone and its records. The `build()` method is called last to ensure the resource is fully constructed.