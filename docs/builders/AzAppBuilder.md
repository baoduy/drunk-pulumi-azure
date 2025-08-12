# **AzAppBuilder Class Documentation**

## **Overview**
The `AzAppBuilder` class is designed to simplify the creation and configuration of Azure App Service and Function App resources using Pulumi. This class follows the Builder pattern, providing a fluent interface for defining App Service Plans and Function Apps with their configurations.

## **Key Methods and Their Attributes**

### **Constructor**
```typescript
constructor(args: AzAppBuilderArgs)
```
Initializes the `AzAppBuilder` with the provided arguments.

**Parameters:**
- `args`: AzAppBuilderArgs - The basic configuration properties for the Azure App Service resource.

**Usage:**
```typescript
const azAppBuilder = new AzAppBuilder({
  name: 'my-app-service',
  group: { resourceGroupName: 'my-resource-group' },
  envUIDInfo: { id: 'user-assigned-identity-id' },
  logInfo: { 
    appInsight: { 
      instrumentationKey: 'app-insights-key',
      connectionString: 'app-insights-connection-string'
    }
  }
  // other necessary arguments
});
```

### **`withPlan(props: AzAppBuilderKinds)`**
Sets the App Service Plan configuration for the Azure App Service.

**Parameters:**
- `props`: AzAppBuilderKinds - The App Service Plan configuration including:
  - `kind`: string - The kind of App Service Plan (e.g., 'FunctionApp', 'Windows', 'Linux')
  - `sku`: object - SKU configuration with tier, name, and capacity

**Returns:** `IAzAppBuilder` - The current AzAppBuilder instance for method chaining.

**Usage:**
```typescript
azAppBuilder.withPlan({
  kind: 'FunctionApp',
  sku: {
    tier: 'Dynamic',
    name: 'Y1',
    capacity: 1
  }
});
```

### **`withFunc(props: AzFuncAppBuilderType)`**
Adds a Function App to the App Service Plan.

**Parameters:**
- `props`: AzFuncAppBuilderType - The Function App configuration including:
  - `name`: string - The name of the Function App
  - `appSettings`: array - Application settings for the Function App
  - `runtime`: string - Runtime stack (e.g., 'dotnet', 'node', 'python')
  - `version`: string - Runtime version
  - `storage`: object - Storage account configuration

**Returns:** `IAzAppBuilder` - The current AzAppBuilder instance for method chaining.

**Usage:**
```typescript
azAppBuilder.withFunc({
  name: 'my-function-app',
  runtime: 'dotnet',
  version: '6.0',
  appSettings: [
    { name: 'CUSTOM_SETTING', value: 'custom-value' },
    { name: 'ANOTHER_SETTING', value: 'another-value' }
  ],
  storage: {
    accountName: 'mystorageaccount',
    containerName: 'function-deployments'
  }
});
```

### **`build()`**
Builds and deploys the App Service Plan and Function Apps based on the current configuration.

**Returns:** `ResourceInfo` - Resource information for the deployed App Service Plan instance.

**Usage:**
```typescript
const appServiceResource = azAppBuilder.build();
```

## **Example of Full Usage**
Here's a complete example demonstrating how to use the `AzAppBuilder` with all available properties:

```typescript
import { AzAppBuilder } from './Builder/AzAppBuilder';
import { AzAppBuilderArgs } from './types';

const args: AzAppBuilderArgs = {
  name: 'my-app-service',
  group: { resourceGroupName: 'my-resource-group' },
  envUIDInfo: { id: 'user-assigned-identity-id' },
  logInfo: { 
    appInsight: { 
      instrumentationKey: 'app-insights-key',
      connectionString: 'app-insights-connection-string'
    }
  }
};

const azAppBuilder = new AzAppBuilder(args);

azAppBuilder
  .withPlan({
    kind: 'FunctionApp',
    sku: {
      tier: 'Dynamic',
      name: 'Y1',
      capacity: 1
    }
  })
  .withFunc({
    name: 'order-processor',
    runtime: 'dotnet',
    version: '6.0',
    appSettings: [
      { name: 'CosmosDB_ConnectionString', value: 'cosmos-connection-string' },
      { name: 'ServiceBus_ConnectionString', value: 'servicebus-connection-string' }
    ],
    storage: {
      accountName: 'mystorageaccount',
      containerName: 'function-deployments'
    }
  })
  .withFunc({
    name: 'notification-service',
    runtime: 'node',
    version: '18',
    appSettings: [
      { name: 'SENDGRID_API_KEY', value: 'sendgrid-api-key' },
      { name: 'TWILIO_AUTH_TOKEN', value: 'twilio-auth-token' }
    ],
    storage: {
      accountName: 'mystorageaccount',
      containerName: 'notification-deployments'
    }
  });

const appServiceResource = azAppBuilder.build();
```

## **Features**

### **Automatic Configuration**
- **Identity Management**: Automatically configures System-Assigned and User-Assigned managed identities
- **Application Insights**: Automatically configures Application Insights integration when provided
- **HTTPS Enforcement**: Automatically enables HTTPS-only access for security
- **Zone Redundancy**: Automatically enables zone redundancy in production environments

### **Function App Features**
- **Multiple Function Apps**: Supports multiple Function Apps on the same App Service Plan
- **Runtime Support**: Supports various runtime stacks (.NET, Node.js, Python, etc.)
- **Custom Settings**: Allows custom application settings for each Function App
- **Storage Integration**: Configures storage accounts for Function App deployments

### **Production Optimizations**
- **Zone Redundancy**: Enabled automatically in production environments
- **Security**: HTTPS-only enforcement and managed identity configuration
- **Monitoring**: Automatic Application Insights integration for telemetry

## **Summary**
- **Constructor**: Initializes the builder with necessary arguments including identity and logging configuration.
- **withPlan**: Configures the App Service Plan with SKU and kind specifications.
- **withFunc**: Adds Function Apps with runtime, settings, and storage configurations.
- **build**: Executes the build process and returns the resource information.

This guideline should help developers understand and reuse the methods in the `AzAppBuilder` class effectively.