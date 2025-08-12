# **AzSearchBuilder Class Documentation**

## **Overview**
The `AzSearchBuilder` class is designed to simplify the creation and configuration of Azure Search Service (Azure Cognitive Search) resources using Pulumi. This class follows the Builder pattern, providing a fluent interface for defining various aspects of a search service, including SKU selection, network configurations, and encryption settings.

## **Key Methods and Their Attributes**

### **Constructor**
```typescript
constructor(args: AzSearchBuilderArgs)
```
Initializes the `AzSearchBuilder` with the provided arguments.

**Parameters:**
- `args`: AzSearchBuilderArgs - The basic configuration properties for the Azure Search Service resource including:
  - `name`: string - The name of the search service
  - `group`: ResourceGroupInfo - Resource group information
  - `enableEncryption`: boolean - Whether to enable customer-managed key encryption
  - `dependsOn`: array - Resource dependencies
  - `ignoreChanges`: array - Properties to ignore during updates

**Usage:**
```typescript
const azSearchBuilder = new AzSearchBuilder({
  name: 'my-search-service',
  group: { resourceGroupName: 'my-resource-group' },
  enableEncryption: true,
  // other necessary arguments
});
```

### **`withSku(sku: search.SkuName)`**
Sets the SKU for the Azure Search Service.

**Parameters:**
- `sku`: search.SkuName - The SKU to set for the search service:
  - `Free`: Free tier with limited capacity (1 service per subscription)
  - `Basic`: Basic tier with moderate capacity and availability
  - `Standard`: Standard tier with high capacity and availability
  - `Standard2`: Enhanced standard tier with additional capacity
  - `Standard3`: High-capacity standard tier
  - `Storage_Optimized_L1`: Storage optimized tier for large data volumes (L1)
  - `Storage_Optimized_L2`: Storage optimized tier for large data volumes (L2)

**Returns:** `IAzSearchBuilder` - The current AzSearchBuilder instance for method chaining.

**Usage:**
```typescript
azSearchBuilder.withSku(search.SkuName.Standard);
```

### **`withNetwork(props: AzSearchNetworkType)`**
Sets network configuration for the Azure Search Service.

**Parameters:**
- `props`: AzSearchNetworkType - The network properties including:
  - `privateEndpoint`: object - Private endpoint configuration
    - `subnetIds`: string[] - Array of subnet IDs for private endpoints
    - `privateIpAddress`: string - (Optional) Private IP address
    - `extraVnetIds`: string[] - (Optional) Extra VNet IDs for DNS zone linking
  - `publicNetworkAccess`: string - Public network access setting ('Enabled' or 'Disabled')
  - `ipRules`: array - IP firewall rules for network access control

**Returns:** `IAzSearchBuilder` - The current AzSearchBuilder instance for method chaining.

**Usage:**
```typescript
azSearchBuilder.withNetwork({
  privateEndpoint: {
    subnetIds: ['subnet-id-1', 'subnet-id-2'],
    privateIpAddress: '10.0.0.10',
    extraVnetIds: ['vnet-id-1']
  },
  publicNetworkAccess: 'Disabled',
  ipRules: [
    { value: '192.168.1.0/24', action: 'Allow' },
    { value: '10.0.0.0/16', action: 'Allow' }
  ]
} as AzSearchNetworkType);
```

### **`build()`**
Builds and deploys the Azure Search Service based on the current configuration.

**Returns:** `ResourceInfo` - Resource information for the deployed search service instance.

**Usage:**
```typescript
const searchServiceResource = azSearchBuilder.build();
```

## **Example of Full Usage**
Here's a complete example demonstrating how to use the `AzSearchBuilder` with all available properties:

```typescript
import { AzSearchBuilder } from './Builder/AzSearchBuilder';
import * as search from '@pulumi/azure-native/search';
import { AzSearchBuilderArgs } from './types';

const args: AzSearchBuilderArgs = {
  name: 'my-search-service',
  group: { resourceGroupName: 'my-resource-group' },
  enableEncryption: true,
  // other necessary arguments
};

const azSearchBuilder = new AzSearchBuilder(args);

azSearchBuilder
  .withSku(search.SkuName.Standard)
  .withNetwork({
    privateEndpoint: {
      subnetIds: ['subnet-id-1', 'subnet-id-2'],
      privateIpAddress: '10.0.0.10',
      extraVnetIds: ['vnet-id-1']
    },
    publicNetworkAccess: 'Disabled',
    ipRules: [
      { value: '192.168.1.0/24', action: 'Allow' },
      { value: '10.0.0.0/16', action: 'Allow' }
    ]
  } as AzSearchNetworkType);

const searchServiceResource = azSearchBuilder.build();
```

## **Features**

### **Automatic Configuration**
- **Authentication**: Automatically configures Azure AD and API key authentication
- **Encryption**: Supports customer-managed key encryption when enabled
- **Identity**: Automatically configures system-assigned managed identity
- **Hosting**: Configured for default hosting mode with optimal settings

### **Security Features**
- **Private Endpoints**: Support for private endpoint configuration
- **Network Access Control**: IP firewall rules for network security
- **Azure AD Integration**: Built-in Azure AD authentication support
- **Encryption at Rest**: Customer-managed key encryption support

### **SKU Options**
- **Free Tier**: For development and testing (limited capacity)
- **Basic Tier**: For small to medium workloads
- **Standard Tiers**: For production workloads with high availability
- **Storage Optimized**: For large data volumes with cost optimization

### **Key Vault Integration**
- **Connection Strings**: Automatically stores connection strings in Key Vault
- **Admin Keys**: Securely stores admin keys for service management

## **Summary**
- **Constructor**: Initializes the builder with necessary arguments including encryption settings.
- **withSku**: Configures the SKU for the Azure Search Service (Free, Basic, Standard, Storage Optimized).
- **withNetwork**: Configures network settings including private endpoints and IP firewall rules.
- **build**: Executes the build process and returns the resource information.

This guideline should help developers understand and reuse the methods in the `AzSearchBuilder` class effectively.