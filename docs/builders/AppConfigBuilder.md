# **Guideline for Using the `AppConfigBuilder` Class**

#### **1. Overview**
The `AppConfigBuilder` class is designed to simplify the process of creating and managing Azure App Configuration instances using TypeScript and Pulumi. This guideline will walk you through the steps needed to effectively use the class in your infrastructure-as-code (IaC) projects.

#### **2. Prerequisites**
Before using `AppConfigBuilder`, ensure you have:
- A working Pulumi environment with Azure access.
- Basic understanding of TypeScript, Pulumi, and Azure App Configuration.
- Familiarity with the custom types defined in your project.

#### **3. Creating an Instance of `AppConfigBuilder`**
Create an instance of `AppConfigBuilder` by providing an object of type `AppConfigBuilderArgs`. This object should include properties like the resource name, resource group name, and location.

```typescript
const appConfigBuilder = new AppConfigBuilder({
  resourceName: 'my-app-config',
  resourceGroupName: 'my-resource-group',
  location: 'East US',
  enableEncryption: true,
} as AppConfigBuilderArgs);
```

#### **4. Configuring Network Settings**
Configure the network settings using the `AppConfigNetworkType`. This allows you to specify private link settings and other network-related configurations. Note that `subnetIds` is an array, allowing you to specify multiple subnets.

```typescript
appConfigBuilder.withNetwork({
  privateEndpoint: {
    subnetIds: ['subnet-id-1', 'subnet-id-2'],
  },
  disableLocalAuth: true,
} as AppConfigNetworkType);
```

#### **5. Setting Additional Options**
Use `AppConfigOptionsBuilder` to set additional options, such as enabling purge protection and configuring the retention period for soft deletes.

```typescript
appConfigBuilder.withOptions({
  enablePurgeProtection: true,
  softDeleteRetentionInDays: 90,
} as AppConfigOptionsBuilder);
```

#### **6. Building and Deploying the Configuration**
After configuring the builder, use the `build` method to deploy the App Configuration instance. Pulumi handles the creation and deployment of the resource.

```typescript
const appConfigInstance = appConfigBuilder.build();
```

#### **7. Example of Full Usage**
Here’s a complete example that demonstrates how to use the `AppConfigBuilder`:

```typescript
const appConfigBuilder = new AppConfigBuilder({
  resourceName: 'my-app-config',
  resourceGroupName: 'my-resource-group',
  location: 'East US',
  enableEncryption: true,
} as AppConfigBuilderArgs);

appConfigBuilder
  .withNetwork({
    privateEndpoint: {
      subnetIds: ['subnet-id-1', 'subnet-id-2'],
    },
    disableLocalAuth: true,
  } as AppConfigNetworkType)
  .withOptions({
    enablePurgeProtection: true,
    softDeleteRetentionInDays: 90,
  } as AppConfigOptionsBuilder);

const appConfigInstance = appConfigBuilder.build();
```

#### **8. Conclusion**
The `AppConfigBuilder` class offers a streamlined approach to defining and managing Azure App Configuration instances in your Pulumi projects. By utilizing the provided types and methods, you can ensure that your configurations are robust and maintainable.
