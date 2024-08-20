# Class: `CdnBuilder`

#### Constructor
**Purpose**: Initializes the `CdnBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new CdnBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
});
```





#### Method: `withEndpoint`
**Purpose**: Adds an endpoint to the CDN profile.

**Usage**:
```typescript
builder.withEndpoint({
  name: 'endpointName',
  originHostHeader: 'origin.example.com',
  originPath: '/path',
  origins: [{ name: 'origin1', hostName: 'origin1.example.com' }],
});
```





#### Method: `build`
**Purpose**: Builds the entire CDN profile and its endpoints with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```





### Example Usage
Here is a complete example that demonstrates how to use the `CdnBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new CdnBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
});

builder.withEndpoint({
  name: 'endpointName',
  originHostHeader: 'origin.example.com',
  originPath: '/path',
  origins: [{ name: 'origin1', hostName: 'origin1.example.com' }],
});

const resourceInfo = builder.build();
console.log(resourceInfo);
```





### Detailed Guidelines for Each Method

#### Constructor
**Purpose**: Initializes the `CdnBuilder` with the provided arguments and sets up the initial state.

**Usage**:
```typescript
const builder = new CdnBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
});
```





#### Method: `withEndpoint`
**Purpose**: Adds an endpoint to the CDN profile.

**Usage**:
```typescript
builder.withEndpoint({
  name: 'endpointName',
  originHostHeader: 'origin.example.com',
  originPath: '/path',
  origins: [{ name: 'origin1', hostName: 'origin1.example.com' }],
});
```





#### Method: `build`
**Purpose**: Builds the entire CDN profile and its endpoints with the configured properties.

**Usage**:
```typescript
const resourceInfo = builder.build();
console.log(resourceInfo);
```





### Example Usage
Here is a complete example that demonstrates how to use the `CdnBuilder` class, ensuring that the `build()` method is called at the end:

```typescript
const builder = new CdnBuilder({
  name: 'example',
  group: { resourceGroupName: 'resourceGroup' },
});

builder.withEndpoint({
  name: 'endpointName',
  originHostHeader: 'origin.example.com',
  originPath: '/path',
  origins: [{ name: 'origin1', hostName: 'origin1.example.com' }],
});

const resourceInfo = builder.build();
console.log(resourceInfo);
```





This example demonstrates how to create a `CdnBuilder` instance, configure it with various settings, and finally build the CDN profile and its endpoints. The `build()` method is called last to ensure the resource is fully constructed.