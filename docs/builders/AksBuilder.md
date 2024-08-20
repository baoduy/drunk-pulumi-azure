# **AksBuilder Class Documentation**

#### **1. Overview**
The `AksBuilder` class is designed to streamline the process of creating and configuring Azure Kubernetes Service (AKS) clusters using Pulumi. This class uses a builder pattern to offer a fluent interface for defining various aspects of an AKS cluster, including network settings, node pools, identity configurations, SSH access, and more.

#### **2. Key Properties and Methods**

##### **2.1. Properties**
- **resourceName**: The name of the AKS cluster.
- **resourceGroupName**: The name of the resource group in which the AKS cluster is deployed.
- **location**: The Azure region where the AKS cluster is deployed.
- **envRoles**: Environment roles associated with the AKS cluster.

##### **2.2. Methods**

###### **2.2.1. withSsh(props: SshBuilderProps)**
Configures SSH access using an existing SSH key.

- **Parameters:**
  - `username`: The username for the SSH access.
  - `sshPublicKey`: The SSH public key used for authentication.

- **Usage:**
  ```typescript
  aksBuilder.withSsh({
    username: 'adminuser',
    sshPublicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEA...',
  } as SshBuilderProps);
  ```

###### **2.2.2. withNewSsh(props: { loginPrefix: string; maxUserNameLength: number; })**
Generates a new SSH key and configures it for the AKS cluster.

- **Parameters:**
  - `loginPrefix`: A prefix for the generated SSH login.
  - `maxUserNameLength`: The maximum length of the SSH username.

- **Usage:**
  ```typescript
  aksBuilder.withNewSsh({
    loginPrefix: 'drunk',
    maxUserNameLength: 15,
  });
  ```

###### **2.2.3. withNetwork(props: AksNetworkProps)**
Defines the network configuration for the AKS cluster.

- **Parameters:**
  - `subnetId`: The ID of the subnet where the AKS cluster is deployed.
  - `virtualHostSubnetName`: (Optional) The name of the virtual host subnet.
  - `extraVnetIds`: (Optional) An array of additional Virtual Network IDs for Private DNS Zone linking.
  - `outboundIpAddress`: (Optional) The outbound IP address configuration, including `ipAddressId` and `ipAddressPrefixId`.

- **Usage:**
  ```typescript
  aksBuilder.withNetwork({
    subnetId: 'subnet-id',
    virtualHostSubnetName: 'virtual-host-subnet',
    extraVnetIds: ['vnet-id-1', 'vnet-id-2'],
    outboundIpAddress: {
      ipAddressId: 'ip-address-id',
      ipAddressPrefixId: 'ip-prefix-id',
    },
  } as AksNetworkProps);
  ```

###### **2.2.4. withDefaultNodePool(props: NodePoolProps)**
Configures the default node pool for the AKS cluster.

- **Parameters:**
  - `name`: The name of the node pool.
  - `nodeCount`: The number of nodes in the pool.
  - `vmSize`: The VM size for the nodes in the pool.
  - `enableAutoScaling`: A boolean indicating whether auto-scaling is enabled.
  - `minCount`: The minimum number of nodes for auto-scaling.
  - `maxCount`: The maximum number of nodes for auto-scaling.

- **Usage:**
  ```typescript
  aksBuilder.withDefaultNodePool({
    name: 'defaultpool',
    nodeCount: 3,
    vmSize: 'Standard_DS2_v2',
    enableAutoScaling: true,
    minCount: 1,
    maxCount: 5,
  } as NodePoolProps);
  ```

###### **2.2.5. withFeatures(props: AskFeatureProps)**
Enables specific features for the AKS cluster, such as monitoring and HTTP application routing.

- **Parameters:**
  - `httpApplicationRouting`: A boolean indicating whether HTTP application routing is enabled.
  - `monitoring`: A boolean indicating whether monitoring is enabled.

- **Usage:**
  ```typescript
  aksBuilder.withFeatures({
    httpApplicationRouting: true,
    monitoring: true,
  } as AskFeatureProps);
  ```

###### **2.2.6. withAddons(props: AskAddonProps)**
Adds specific add-ons to the AKS cluster, such as Azure Policy and Ingress Application Gateway.

- **Parameters:**
  - `azurePolicy`: A boolean indicating whether Azure Policy is enabled.
  - `ingressApplicationGateway`: Configuration for the Ingress Application Gateway, including `enabled` and `gatewayName`.

- **Usage:**
  ```typescript
  aksBuilder.withAddons({
    azurePolicy: true,
    ingressApplicationGateway: {
      enabled: true,
      gatewayName: 'my-app-gateway',
    },
  } as AskAddonProps);
  ```

###### **2.2.7. withImport(props: AksImportProps)**
Imports an existing AKS cluster into the configuration.

- **Parameters:**
  - `id`: The ID of the existing AKS cluster.
  - `ignoreChanges`: An array of properties to ignore during the import process.

- **Usage:**
  ```typescript
  aksBuilder.withImport({
    id: '/subscriptions/your-subscription-id/resourceGroups/my-resource-group/providers/Microsoft.ContainerService/managedClusters/my-aks-cluster',
    ignoreChanges: ['agentPoolProfile'],
  } as AksImportProps);
  ```

###### **2.2.8. build(): Promise<AksResults>**
Deploys the AKS cluster based on the current configuration.

- **Returns:** A `Promise` resolving to an `AksResults` object containing details about the deployed cluster.

- **Usage:**
  ```typescript
  const aksCluster = await aksBuilder.build();
  ```

#### **3. Example of Full Usage**
Here’s a complete example demonstrating how to use the `AksBuilder` with all available properties:

```typescript
const aksBuilder = new AksBuilder({
  resourceName: 'my-aks-cluster',
  resourceGroupName: 'my-resource-group',
  location: 'East US',
  envRoles: ['my-role'],
} as AksBuilderArgs);

aksBuilder
  .withSsh({
    username: 'adminuser',
    sshPublicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEA...',
  } as SshBuilderProps)
  .withNewSsh({
    loginPrefix: 'drunk',
    maxUserNameLength: 15,
  })
  .withNetwork({
    subnetId: 'subnet-id',
    virtualHostSubnetName: 'virtual-host-subnet',
    extraVnetIds: ['vnet-id-1', 'vnet-id-2'],
    outboundIpAddress: {
      ipAddressId: 'ip-address-id',
      ipAddressPrefixId: 'ip-prefix-id',
    },
  } as AksNetworkProps)
  .withDefaultNodePool({
    name: 'defaultpool',
    nodeCount: 3,
    vmSize: 'Standard_DS2_v2',
    enableAutoScaling: true,
    minCount: 1,
    maxCount: 5,
  } as NodePoolProps)
  .withFeatures({
    httpApplicationRouting: true,
    monitoring: true,
  } as AskFeatureProps)
  .withAddons({
    azurePolicy: true,
    ingressApplicationGateway: {
      enabled: true,
      gatewayName: 'my-app-gateway',
    },
  } as AskAddonProps);

const aksCluster = await aksBuilder.build();
```

#### **4. Conclusion**
The `AksBuilder` class offers a robust and flexible approach to configuring and deploying Azure Kubernetes Service clusters. With detailed configuration options for SSH, networking, node pools, and more, developers can tailor their AKS deployments to meet a wide range of requirements.
