# AppContainerBuilder

The `AppContainerBuilder` provides a fluent interface for creating and configuring Azure Container Apps with their managed environments. It supports advanced features like Dapr integration, auto-scaling, ingress configuration, and seamless integration with Key Vault secrets.

## Overview

Azure Container Apps is a fully managed serverless container service that enables you to run containerized applications without managing complex infrastructure. The `AppContainerBuilder` simplifies the creation of Container Apps by:

- **Automatic Environment Management**: Creates managed environments with integrated logging
- **Simplified Configuration**: Fluent API for containers, ingress, scaling, and secrets
- **Dapr Integration**: First-class support for Dapr microservices
- **Security**: Built-in RBAC, managed identities, and Key Vault integration
- **VNet Integration**: Support for private networking
- **Auto-scaling**: HTTP-based and custom metric scaling rules

## Basic Usage

### Simple Container App

```typescript
import { AppContainerBuilder } from '@drunk-pulumi/azure';

const containerApp = AppContainerBuilder({ name: 'myapp', group })
  .withEnvironment()
  .withContainer({
    image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest',
    resources: { cpu: 0.5, memory: '1Gi' }
  })
  .withIngress({ 
    external: true, 
    targetPort: 80 
  })
  .build();
```

## Builder Methods

### withEnvironment(props?)

Configure the Container Apps managed environment.

**Parameters:**
- `workloadProfileType?`: Workload profile ('Consumption', 'D4', 'D8', etc.)
- `logsDestination?`: Logs destination ('log-analytics' or 'azure-monitor')
- `vnetConfiguration?`: VNet integration settings
- `zoneRedundant?`: Enable zone redundancy (defaults to `true` in production)

**Example:**
```typescript
.withEnvironment({
  workloadProfileType: 'Consumption',
  logsDestination: 'log-analytics',
  vnetConfiguration: {
    infrastructureSubnetId: subnet.id,
    internal: true
  },
  zoneRedundant: true
})
```

### withContainer(props)

Add a container configuration. Can be called multiple times for multi-container apps.

**Parameters:**
- `image`: Container image to use (required)
- `name?`: Container name (defaults to 'main')
- `resources?`: CPU and memory allocation
- `env?`: Environment variables
- `command?`: Override container command
- `args?`: Command arguments
- `probes?`: Health check probes

**Example:**
```typescript
.withContainer({
  image: 'myregistry.azurecr.io/myapp:latest',
  name: 'api',
  resources: { 
    cpu: 1.0, 
    memory: '2Gi' 
  },
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'API_KEY', secretRef: 'api-key' }
  ],
  probes: [{
    type: 'Liveness',
    httpGet: {
      path: '/health',
      port: 8080,
      scheme: 'HTTP'
    },
    initialDelaySeconds: 10,
    periodSeconds: 30
  }]
})
```

### withIngress(props)

Configure ingress settings for external or internal traffic.

**Parameters:**
- `external?`: Expose to public internet (default: `false`)
- `targetPort?`: Port to route traffic to
- `transport?`: Protocol ('auto', 'http', 'http2', 'tcp')
- `allowInsecure?`: Allow HTTP traffic (default: `false`)
- `customDomains?`: Custom domain configurations
- `traffic?`: Traffic splitting between revisions

**Example:**
```typescript
.withIngress({
  external: true,
  targetPort: 8080,
  transport: 'http2',
  allowInsecure: false,
  customDomains: [{
    name: 'api.example.com',
    certificateId: certId,
    bindingType: 'SniEnabled'
  }],
  traffic: [{
    latestRevision: true,
    weight: 100
  }]
})
```

### withScale(props)

Configure auto-scaling behavior.

**Parameters:**
- `minReplicas?`: Minimum replica count (default: 0)
- `maxReplicas?`: Maximum replica count (default: 10)
- `rules?`: Scaling rules (HTTP or custom)

**Example:**
```typescript
.withScale({
  minReplicas: 1,
  maxReplicas: 20,
  rules: [{
    name: 'http-scaling',
    http: {
      metadata: {
        concurrentRequests: '50'
      }
    }
  }, {
    name: 'queue-scaling',
    custom: {
      type: 'azure-servicebus',
      metadata: {
        queueName: 'jobs',
        messageCount: '10'
      }
    }
  }]
})
```

### withSecrets(secrets)

Add secrets to the Container App. Secrets can be inline values or Key Vault references.

**Parameters:**
- `name`: Secret name
- `value?`: Secret value (for inline secrets)
- `keyVaultUrl?`: Key Vault secret URL
- `identity?`: Identity for Key Vault access

**Example:**
```typescript
.withSecrets([
  { 
    name: 'api-key', 
    value: requireSecret('apiKey') 
  },
  {
    name: 'db-connection',
    keyVaultUrl: 'https://myvault.vault.azure.net/secrets/db-connection',
    identity: envUIDInfo.id
  }
])
```

### withRegistry(registry)

Configure container registry credentials. Can be called multiple times for multiple registries.

**Parameters:**
- `server`: Registry server (e.g., 'myregistry.azurecr.io')
- `username?`: Registry username
- `passwordSecretRef?`: Reference to password secret
- `identity?`: Managed identity for authentication

**Example:**
```typescript
// Using managed identity (recommended)
.withRegistry({
  server: 'myregistry.azurecr.io',
  identity: envUIDInfo.id
})

// Using username/password
.withRegistry({
  server: 'docker.io',
  username: 'myuser',
  passwordSecretRef: 'docker-password'
})
```

### withDapr(props)

Enable and configure Dapr integration for microservices.

**Parameters:**
- `appId?`: Dapr application ID
- `appPort?`: Application port for Dapr
- `appProtocol?`: Protocol ('http' or 'grpc')
- `enabled?`: Enable Dapr (default: `true`)
- `httpMaxRequestSize?`: Max request size in MB
- `httpReadBufferSize?`: Read buffer size in KB
- `enableApiLogging?`: Enable API logging
- `logLevel?`: Log level ('info', 'debug', 'warn', 'error')

**Example:**
```typescript
.withDapr({
  appId: 'myapp',
  appPort: 8080,
  appProtocol: 'http',
  enabled: true,
  enableApiLogging: true,
  logLevel: 'info'
})
```

### withIdentity(type)

Configure managed identity for the Container App.

**Parameters:**
- `type`: 'SystemAssigned', 'UserAssigned', or 'SystemAssigned,UserAssigned'

**Example:**
```typescript
.withIdentity('SystemAssigned,UserAssigned')
```

### lock()

Lock the Container App to prevent accidental deletion.

**Example:**
```typescript
.lock()
```

## Complete Examples

### Production Web Application

```typescript
import { ResourceBuilder, AppContainerBuilder, AcrBuilder } from '@drunk-pulumi/azure';

// Create foundation resources
const foundation = await ResourceBuilder('webapp')
  .createRoles()
  .createRG({ enableVaultRoles: true })
  .createVault()
  .createEnvUID()
  .withLogInfo({ logWp, logStorage, appInsight })
  .build();

// Create container registry
const acr = AcrBuilder({ 
  name: 'registry', 
  group: foundation.group 
})
  .withSku('Premium')
  .build();

// Deploy container app
const app = AppContainerBuilder({
  name: 'webapp',
  group: foundation.group,
  vaultInfo: foundation.vaultInfo,
  envUIDInfo: foundation.envUIDInfo,
  envRoles: foundation.envRoles,
  logInfo: foundation.logInfo
})
  .withEnvironment({
    workloadProfileType: 'Consumption',
    zoneRedundant: true
  })
  .withRegistry({
    server: acr.instance.loginServer,
    identity: foundation.envUIDInfo!.id
  })
  .withSecrets([
    {
      name: 'db-connection',
      keyVaultUrl: pulumi.interpolate`${foundation.vaultInfo!.instance.properties.vaultUri}secrets/db-connection`,
      identity: foundation.envUIDInfo!.id
    }
  ])
  .withContainer({
    image: pulumi.interpolate`${acr.instance.loginServer}/webapp:latest`,
    resources: { cpu: 1.0, memory: '2Gi' },
    env: [
      { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' },
      { name: 'ConnectionStrings__Default', secretRef: 'db-connection' }
    ],
    probes: [{
      type: 'Liveness',
      httpGet: { path: '/health', port: 8080 },
      periodSeconds: 30
    }]
  })
  .withIngress({
    external: true,
    targetPort: 8080,
    transport: 'http2'
  })
  .withScale({
    minReplicas: 2,
    maxReplicas: 20,
    rules: [{
      name: 'http-rule',
      http: {
        metadata: { concurrentRequests: '100' }
      }
    }]
  })
  .withIdentity('SystemAssigned,UserAssigned')
  .lock()
  .build();
```

### Microservices with Dapr

```typescript
// API Service
const apiService = AppContainerBuilder({
  name: 'api',
  group,
  vaultInfo,
  logInfo
})
  .withEnvironment()
  .withContainer({
    image: 'myregistry.azurecr.io/api:latest',
    resources: { cpu: 0.5, memory: '1Gi' }
  })
  .withDapr({
    appId: 'api-service',
    appPort: 8080,
    appProtocol: 'http',
    enableApiLogging: true
  })
  .withIngress({
    external: true,
    targetPort: 8080
  })
  .build();

// Worker Service
const workerService = AppContainerBuilder({
  name: 'worker',
  group,
  vaultInfo,
  logInfo
})
  .withEnvironment()
  .withContainer({
    image: 'myregistry.azurecr.io/worker:latest',
    resources: { cpu: 1.0, memory: '2Gi' },
    env: [
      { name: 'API_URL', value: pulumi.interpolate`https://${apiService.id}` }
    ]
  })
  .withDapr({
    appId: 'worker-service',
    appPort: 8081,
    appProtocol: 'grpc'
  })
  .withScale({
    minReplicas: 1,
    maxReplicas: 10,
    rules: [{
      name: 'queue-scale',
      custom: {
        type: 'azure-servicebus',
        metadata: {
          queueName: 'jobs',
          messageCount: '5'
        }
      }
    }]
  })
  .build();
```

### VNet-Integrated Private App

```typescript
import { VnetBuilder, AppContainerBuilder } from '@drunk-pulumi/azure';

// Create VNet
const network = VnetBuilder({ name: 'vnet', group })
  .asHub({
    addressSpaces: ['10.0.0.0/16'],
    subnets: {
      containers: { addressPrefix: '10.0.1.0/24' }
    }
  })
  .build();

// Deploy internal container app
const internalApp = AppContainerBuilder({
  name: 'internal-api',
  group,
  logInfo
})
  .withEnvironment({
    vnetConfiguration: {
      infrastructureSubnetId: network.subnets['containers'].id,
      internal: true
    }
  })
  .withContainer({
    image: 'myregistry.azurecr.io/internal-api:latest',
    resources: { cpu: 0.5, memory: '1Gi' }
  })
  .withIngress({
    external: false,  // Internal only
    targetPort: 8080
  })
  .build();
```

## RBAC Integration

When `envRoles` is provided, the builder automatically assigns appropriate roles:

- **ReadOnly**: ContainerApp Reader
- **Contributor**: Azure ContainerApps Session Executor
- **Admin**: Contributor

```typescript
const app = AppContainerBuilder({
  name: 'myapp',
  group,
  envRoles: foundation.envRoles  // Auto-assigns roles
})
  .withEnvironment()
  .withContainer({ image: '...' })
  .build();
```

## Resource Naming

The builder uses automated naming conventions:

- **Container App**: `{prefix}-{name}-{org}-{region}-capp`
- **Environment**: `{prefix}-{name}-env-{org}-{region}-capp-env`

Examples:
- Dev: `dev-myapp-myorg-seau-capp`, `dev-myapp-env-myorg-seau-capp-env`
- Prd: `prd-myapp-myorg-seau-capp`, `prd-myapp-env-myorg-seau-capp-env`

## Best Practices

### 1. Use Managed Identities
```typescript
// ✅ Good - managed identity for registry
.withRegistry({
  server: 'myregistry.azurecr.io',
  identity: envUIDInfo.id
})

// ❌ Bad - hardcoded credentials
.withRegistry({
  server: 'myregistry.azurecr.io',
  username: 'admin',
  passwordSecretRef: 'password'
})
```

### 2. Store Secrets in Key Vault
```typescript
// ✅ Good - Key Vault reference
.withSecrets([{
  name: 'api-key',
  keyVaultUrl: vaultSecretUrl,
  identity: envUIDInfo.id
}])

// ❌ Bad - inline secrets
.withSecrets([{
  name: 'api-key',
  value: 'hardcoded-secret-value'
}])
```

### 3. Configure Health Probes
```typescript
// ✅ Good - health checks configured
.withContainer({
  image: '...',
  probes: [{
    type: 'Liveness',
    httpGet: { path: '/health', port: 8080 },
    periodSeconds: 30
  }]
})
```

### 4. Enable Auto-scaling
```typescript
// ✅ Good - proper scaling limits
.withScale({
  minReplicas: isPrd ? 2 : 1,  // HA in production
  maxReplicas: 20,
  rules: [{ /* scaling rules */ }]
})

// ❌ Bad - no scaling configuration
// Defaults to 0-10 replicas without custom rules
```

### 5. Lock Production Resources
```typescript
// ✅ Good - prevent deletion
.lock(isPrd)
.build();
```

### 6. Use Zone Redundancy in Production
```typescript
// ✅ Good - automatic in production
.withEnvironment({
  zoneRedundant: true  // Default for production
})
```

## Return Value

The `build()` method returns a `ResourceInfo` object:

```typescript
type ResourceInfo = {
  name: string;              // Container App name
  group: ResourceGroupInfo;  // Resource group information
  id: Output<string>;        // Container App resource ID
};
```

## See Also

- [AcrBuilder](./AcrBuilder.md) - Azure Container Registry
- [AksBuilder](./AksBuilder.md) - Azure Kubernetes Service
- [VnetBuilder](./VnetBuilder.md) - Virtual Network configuration
- [ResourceBuilder](./ResourceBuilder.md) - Foundation resources

