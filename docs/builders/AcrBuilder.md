# **AcrBuilder Class Documentation**

#### **1. Overview**
The `AcrBuilder` class is designed to simplify the creation and configuration of Azure Container Registry (ACR) resources using Pulumi. This class follows the Builder pattern, providing a fluent interface for defining various aspects of an ACR, including SKU selection, network configurations, policies, and more.

#### **2. Key Methods and Their Attributes**

##### **2.1. `withSku(sku: AcrSkuBuilderType)`**
Configures the SKU for the Azure Container Registry.

- **Parameters:**
    - `sku`: The SKU for the ACR, which can be:
        - `Basic`: The basic SKU for small-scale development and testing.
        - `Standard`: The standard SKU for production workloads.
        - `Premium`: The premium SKU for high-volume production workloads with enhanced features.
        - A custom string representing a specific SKU.

- **Usage:**
  ```typescript
  acrBuilder.withSku('Premium' as AcrSkuBuilderType);
  ```

##### **2.2. `withNetwork(props: AcrBuilderNetworkType)`**
Defines the network settings for the ACR.

- **Parameters:**
    - `privateEndpoint`: Configuration for the private endpoint:
        - `subnetIds`: An array of subnet IDs where the private endpoint will be created.
        - `privateIpAddress`: (Optional) The private IP address assigned to the endpoint.
        - `extraVnetIds`: (Optional) An array of extra Virtual Network IDs for linking to a Private DNS Zone.
    - `disableLocalAuth`: (Optional) A boolean indicating whether local authentication is disabled.

- **Usage:**
  ```typescript
  acrBuilder.withNetwork({
    privateEndpoint: {
      subnetIds: ['subnet-id-1', 'subnet-id-2'],
      privateIpAddress: '10.0.0.5',
      extraVnetIds: ['vnet-id-1', 'vnet-id-2'],
    },
    disableLocalAuth: true,
  } as AcrBuilderNetworkType);
  ```

##### **2.3. `withPolicies(policies: AcrBuilderPolicies)`**
Configures retention policies for the ACR.

- **Parameters:**
    - `retentionDay`: The number of days to retain images in the ACR before automatic deletion.

- **Usage:**
  ```typescript
  acrBuilder.withPolicies({
    retentionDay: 30,
  } as AcrBuilderPolicies);
  ```

##### **2.4. `withPrivateLink(privateLink: AcrPrivateLink)`**
Configures a private link for the ACR.

- **Parameters:**
    - `privateEndpointSubnetIds`: An array of subnet IDs for the private endpoint.
    - `privateDnsZoneId`: The ID of the Private DNS Zone associated with the private link.

- **Usage:**
  ```typescript
  acrBuilder.withPrivateLink({
    privateEndpointSubnetIds: ['subnet-id-1', 'subnet-id-2'],
    privateDnsZoneId: 'dns-zone-id',
  });
  ```

##### **2.5. `build(): registry.Registry`**
Builds and deploys the ACR instance based on the current configuration.

- **Returns:** A `Pulumi registry.Registry` object representing the deployed ACR instance.

- **Usage:**
  ```typescript
  const acrInstance = acrBuilder.build();
  ```

#### **3. Example of Full Usage**
Here’s a complete example demonstrating how to use the `AcrBuilder` with all available properties:

```typescript
const acrBuilder = new AcrBuilder({
  resourceName: 'my-acr',
  resourceGroupName: 'my-resource-group',
  location: 'East US',
} as AcrBuilderArgs);

acrBuilder
  .withSku('Premium' as AcrSkuBuilderType)
  .withNetwork({
    privateEndpoint: {
      subnetIds: ['subnet-id-1', 'subnet-id-2'],
      privateIpAddress: '10.0.0.5',
      extraVnetIds: ['vnet-id-1', 'vnet-id-2'],
    },
    disableLocalAuth: true,
  } as AcrBuilderNetworkType)
  .withPolicies({
    retentionDay: 30,
  } as AcrBuilderPolicies)
  .withPrivateLink({
    privateEndpointSubnetIds: ['subnet-id-1', 'subnet-id-2'],
    privateDnsZoneId: 'dns-zone-id',
  });

const acrInstance = acrBuilder.build();
```

#### **4. Conclusion**
The `AcrBuilder` class provides a robust and flexible way to configure and deploy Azure Container Registry instances. By offering detailed configuration options for SKU, network settings, and policies, it allows developers to customize ACR deployments to meet specific needs.
