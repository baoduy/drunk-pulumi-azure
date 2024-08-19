# Developer Reference Documentation

Welcome to the developer reference documentation. Below you will find links to various builder guides and their summaries.

## [AcrBuilder Usage Guide](./builders/AcrBuilder.md)

### Overview
The `AcrBuilder` class provides a fluent API for creating and configuring Azure Container Registry (ACR) resources. It implements the Builder pattern, allowing developers to set various properties such as SKU, network settings, and policies in a chainable manner.

### Key Sections
- **Creating an AcrBuilder Instance**: Instructions on how to create an instance of `AcrBuilder`.
- **Configuring the ACR**: Methods to set the SKU, network configuration, and policies for the ACR.
- **Building the ACR**: How to build the ACR resource and get the resource information.

For more details, refer to the full documentation [here](./builders/AcrBuilder.md).

## [AksBuilder Documentation](./builders/AksBuilder.md)

### Overview
The `AksBuilder` class provides a fluent API for creating and configuring Azure Kubernetes Service (AKS) clusters.

### Key Sections
- **Constructor**: Initializes the `AksBuilder` with the provided arguments.
- **Methods**: Various methods to configure SSH, node pools, addons, and more.
- **Full Example**: Demonstrates how to use the `AksBuilder` class.

For more details, refer to the full documentation [here](./builders/AksBuilder.md).

## [ApiProductBuilder Documentation](./builders/ApiProductBuilder.md)

### Overview
The `ApiProductBuilder` class provides a fluent API for creating and configuring Azure API Management (APIM) products.

### Key Sections
- **Constructor**: Initializes the `ApiProductBuilder` with the provided arguments.
- **Methods**: Various methods to configure the product, subscription, and APIs.
- **Full Example**: Demonstrates how to use the `ApiProductBuilder` class.

For more details, refer to the full documentation [here](./builders/ApiProductBuilder.md).

## [ApimBuilder Documentation](./builders/ApimBuilder.md)

### Overview
The `ApimBuilder` class provides a fluent API for creating and configuring Azure API Management (APIM) services.

### Key Sections
- **Constructor**: Initializes the `ApimBuilder` with the provided arguments.
- **Methods**: Various methods to configure authentication, certificates, private links, and more.
- **Full Example**: Demonstrates how to use the `ApimBuilder` class.

For more details, refer to the full documentation [here](./builders/ApimBuilder.md).

## [ApimRootBuilder Documentation](./builders/ApimRootBuilder.md)

### Overview
The `ApimRootBuilder` class provides a fluent API for creating and configuring the root of Azure API Management (APIM) services.

### Key Sections
- **Constructor**: Initializes the `ApimRootBuilder` with the provided arguments.
- **Methods**: Various methods to create new products and workspaces.
- **Full Example**: Demonstrates how to use the `ApimRootBuilder` class.

For more details, refer to the full documentation [here](./builders/ApimRootBuilder.md).

## [AppCertBuilder Documentation](./builders/AppCertBuilder.md)

### Overview
The `AppCertBuilder` class provides a fluent API for creating and configuring Azure App Service Certificates.

### Key Sections
- **Constructor**: Initializes the `AppCertBuilder` with the provided arguments.
- **Methods**: Various methods to set domain-specific options and build the certificate.
- **Full Example**: Demonstrates how to use the `AppCertBuilder` class.

For more details, refer to the full documentation [here](./builders/AppCertBuilder.md).

## [AppConfigBuilder Documentation](./builders/AppConfigBuilder.md)

### Overview
The `AppConfigBuilder` class provides a fluent API for creating and configuring Azure App Configuration instances.

### Key Sections
- **Constructor**: Initializes the `AppConfigBuilder` with the provided arguments.
- **Methods**: Various methods to set additional options and private link configurations.
- **Full Example**: Demonstrates how to use the `AppConfigBuilder` class.

For more details, refer to the full documentation [here](./builders/AppConfigBuilder.md).

## [AutomationBuilder Documentation](./builders/AutomationBuilder.md)

### Overview
The `AutomationBuilder` class provides a fluent API for creating and configuring Azure Automation Accounts.

### Key Sections
- **Constructor**: Initializes the `AutomationBuilder` with the provided arguments.
- **Methods**: Various methods to set the SKU and build the Automation Account.
- **Full Example**: Demonstrates how to use the `AutomationBuilder` class.

For more details, refer to the full documentation [here](./builders/AutomationBuilder.md).

## [CdnBuilder Documentation](./builders/CdnBuilder.md)

### Overview
The `CdnBuilder` class provides a fluent API for creating and configuring Azure Content Delivery Network (CDN) profiles and endpoints.

### Key Sections
- **Constructor**: Initializes the `CdnBuilder` with the provided arguments.
- **Methods**: Various methods to configure CDN profiles, endpoints, and custom domains.
- **Full Example**: Demonstrates how to use the `CdnBuilder` class.

For more details, refer to the full documentation [here](./builders/CdnBuilder.md).

## [EnvRoleBuilder Documentation](./builders/EnvRoleBuilder.md)

### Overview
The `EnvRoleBuilder` class provides a fluent API for creating and configuring environment roles.

### Key Sections
- **Constructor**: Initializes the `EnvRoleBuilder` with the provided arguments.
- **Methods**: Various methods to add members, identities, and push roles to Key Vault.
- **Full Example**: Demonstrates how to use the `EnvRoleBuilder` class.

For more details, refer to the full documentation [here](./builders/EnvRoleBuilder.md).

## [IotHubBuilder Documentation](./builders/IotHubBuilder.md)

### Overview
The `IotHubBuilder` class provides a fluent API for creating and configuring Azure IoT Hub instances.

### Key Sections
- **Constructor**: Initializes the `IotHubBuilder` with the provided arguments.
- **Methods**: Various methods to configure SKU, Service Bus, and storage settings.
- **Full Example**: Demonstrates how to use the `IotHubBuilder` class.

For more details, refer to the full documentation [here](./builders/IotHubBuilder.md).

## [LogicAppBuilder Documentation](./builders/LogicAppBuilder.md)

### Overview
The `LogicAppBuilder` class provides a fluent API for creating and configuring Azure Logic Apps.

### Key Sections
- **Constructor**: Initializes the `LogicAppBuilder` with the provided arguments.
- **Methods**: Various methods to set the SKU and build the Logic App.
- **Full Example**: Demonstrates how to use the `LogicAppBuilder` class.

For more details, refer to the full documentation [here](./builders/LogicAppBuilder.md).

## [PrivateDnsZoneBuilder Documentation](./builders/PrivateDnsZoneBuilder.md)

### Overview
The `PrivateDnsZoneBuilder` class provides a fluent API for creating and configuring Azure Private DNS Zones.

### Key Sections
- **Constructor**: Initializes the `PrivateDnsZoneBuilder` with the provided arguments.
- **Methods**: Various methods to link to virtual networks and add A records.
- **Full Example**: Demonstrates how to use the `PrivateDnsZoneBuilder` class.

For more details, refer to the full documentation [here](./builders/PrivateDnsZoneBuilder.md).

## [RedisCacheBuilder Documentation](./builders/RedisCacheBuilder.md)

### Overview
The `RedisCacheBuilder` class provides a fluent API for creating and configuring Azure Redis Cache instances.

### Key Sections
- **Constructor**: Initializes the `RedisCacheBuilder` with the provided arguments.
- **Methods**: Various methods to configure SKU and network settings.
- **Full Example**: Demonstrates how to use the `RedisCacheBuilder` class.

For more details, refer to the full documentation [here](./builders/RedisCacheBuilder.md).

## [ResourceBuilder Documentation](./builders/ResourceBuilder.md)

### Overview
The `ResourceBuilder` class is designed to build and configure various Azure resources, including resource groups, roles, vaults, and virtual networks. It provides a fluent interface for chaining method calls to configure the resources.

### Key Sections
- **Constructor**: Initializes the `ResourceBuilder` with the provided name.
- **Methods**: Various methods to create and configure roles, resource groups, vaults, and virtual networks.
- **Full Example**: Demonstrates how to use the `ResourceBuilder` class.

For more details, refer to the full documentation [here](./builders/ResourceBuilder.md).

## [ServiceBusBuilder Documentation](./builders/ServiceBusBuilder.md)

### Overview
This documentation provides a clear and concise overview of how to use the `ServiceBusBuilder` class to configure and deploy an Azure Service Bus using Pulumi.

### Key Sections
- **Types and Interfaces**: Defines the types and interfaces used to configure and build an Azure Service Bus.
- **Class: `ServiceBusBuilder`**: Implements the `ServiceBusBuilder` class, which helps you configure and deploy an Azure Service Bus with queues, topics, and subscriptions.

For more details, refer to the full documentation [here](./builders/ServiceBusBuilder.md).

## [SignalRBuilder Documentation](./builders/SignalRBuilder.md)

### Overview
The `SignalRBuilder` class provides a fluent API for creating and configuring Azure SignalR instances.

### Key Sections
- **Constructor**: Initializes the `SignalRBuilder` with the provided arguments.
- **Methods**: Various methods to configure kind, SKU, private link, and more.
- **Full Example**: Demonstrates how to use the `SignalRBuilder` class.

For more details, refer to the full documentation [here](./builders/SignalRBuilder.md).

## [SqlBuilder Documentation](./builders/SqlBuilder.md)

### Overview
The `SqlBuilder` class provides a fluent API for creating and configuring Azure SQL instances.

### Key Sections
- **Constructor**: Initializes the `SqlBuilder` with the provided arguments.
- **Methods**: Various methods to configure vulnerability assessment, elastic pools, databases, and more.
- **Full Example**: Demonstrates how to use the `SqlBuilder` class.

For more details, refer to the full documentation [here](./builders/SqlBuilder.md).

## [StorageBuilder Documentation](./builders/StorageBuilder.md)

### Overview
The `StorageBuilder` class provides a fluent API for creating and configuring Azure Storage Accounts.

### Key Sections
- **Constructor**: Initializes the `StorageBuilder` with the provided arguments.
- **Methods**: Various methods to configure containers, queues, file shares, CDN, and more.
- **Full Example**: Demonstrates how to use the `StorageBuilder` class.

For more details, refer to the full documentation [here](./builders/StorageBuilder.md).

## [VaultBuilder Documentation](./builders/VaultBuilder.md)

### Overview
The `VaultBuilder` class is designed to build and configure an Azure Key Vault instance with specific configurations such as secrets, certificates, and network settings.

### Key Sections
- **VaultBuilderResults Class**: Encapsulates the results of building a Key Vault.
- **Constructor**: Initializes the `VaultBuilder` with the provided arguments.
- **Methods**: Various methods to add secrets, certificates, and configure network settings.
- **Full Example**: Demonstrates how to use the `VaultBuilder` class.

For more details, refer to the full documentation [here](./builders/VaultBuilder.md).

## [VdiBuilder Documentation](./builders/VdiBuilder.md)

### Overview
The `VdiBuilder` class provides a fluent API for creating and configuring Azure Virtual Desktop (VDI) instances.

### Key Sections
- **Constructor**: Initializes the `VdiBuilder` with the provided arguments.
- **Methods**: Various methods to add application groups, set options, and configure network settings.
- **Full Example**: Demonstrates how to use the `VdiBuilder` class.

For more details, refer to the full documentation [here](./builders/VdiBuilder.md).

## [VmBuilder Documentation](./builders/VmBuilder.md)

### Overview
The `VmBuilder` class provides a fluent API for creating and configuring Azure Virtual Machine (VM) instances.

### Key Sections
- **Constructor**: Initializes the `VmBuilder` with the provided arguments.
- **Methods**: Various methods to configure OS, size, login, network settings, encryption, and scheduling.
- **Full Example**: Demonstrates how to use the `VmBuilder` class.

For more details, refer to the full documentation [here](./builders/VmBuilder.md).

## [VnetBuilder Documentation](./builders/VnetBuilder.md)

### Overview
The `VnetBuilder` class provides a fluent API for creating and configuring Azure Virtual Network (VNet) instances.

### Key Sections
- **Constructor**: Initializes the `VnetBuilder` with the provided arguments.
- **Methods**: Various methods to configure subnets, public IPs, NAT gateways, VPN gateways, firewalls, bastions, security rules, route rules, private DNS, and peering.
- **Full Example**: Demonstrates how to use the `VnetBuilder` class.

For more details, refer to the full documentation [here](./builders/VnetBuilder.md).