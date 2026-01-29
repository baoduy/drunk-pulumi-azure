# AppContainerBuilder - Quick Start Guide

## Overview

The **AppContainerBuilder** is a new builder added to the `@drunk-pulumi/azure` library that simplifies the creation and configuration of Azure Container Apps. It follows the established builder pattern and integrates seamlessly with other builders like ResourceBuilder, VaultBuilder, and AcrBuilder.

## Key Features

✅ **Managed Environment**: Automatic creation and configuration of Container Apps environments  
✅ **Multi-Container Support**: Add multiple containers to a single app  
✅ **Dapr Integration**: First-class support for Dapr microservices  
✅ **Auto-Scaling**: HTTP and custom metric-based scaling  
✅ **Ingress Configuration**: External and internal traffic management  
✅ **Security**: Managed identities, Key Vault integration, and RBAC  
✅ **VNet Integration**: Private networking support  
✅ **Production Ready**: Zone redundancy, health probes, and resource locking  

## Quick Example

```typescript
import { AppContainerBuilder, ResourceBuilder } from '@drunk-pulumi/azure';

// Create foundation
const foundation = await ResourceBuilder('myapp')
  .createRG()
  .createVault()
  .createEnvUID()
  .build();

// Deploy container app
const app = AppContainerBuilder({
  name: 'api',
  group: foundation.group!,
  vaultInfo: foundation.vaultInfo,
  envUIDInfo: foundation.envUIDInfo
})
  .withEnvironment({ workloadProfileType: 'Consumption' })
  .withContainer({
    image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest',
    resources: { cpu: 0.5, memory: '1Gi' }
  })
  .withIngress({ external: true, targetPort: 80 })
  .withScale({ minReplicas: 1, maxReplicas: 10 })
  .build();
```

## Files Created

### Source Files
- `src/Builder/AppContainerBuilder.ts` - Main builder implementation
- `src/Builder/types/appContainerBuilder.ts` - TypeScript type definitions
- `src/Builder/Samples/AppContainerBuilder.example.ts` - Usage examples
- `docs/builders/AppContainerBuilder.md` - Complete documentation

### Updated Files
- `src/Builder/index.ts` - Added export for AppContainerBuilder
- `src/Builder/types/index.ts` - Added export for appContainerBuilder types
- `src/Common/Naming.ts` - Added naming rules for Container Apps
- `src/types.ts` - Added `enableContainerAppRoles` to RoleEnableTypes
- `src/AzAd/EnvRoles/EnvRoles.Consts.ts` - Added Container App RBAC roles

## Naming Convention

The builder follows the established naming pattern:

- **Container App**: `{prefix}-{name}-{org}-{region}-capp`
- **Environment**: `{prefix}-{name}-env-{org}-{region}-capp-env`

Examples:
- Dev: `dev-myapp-myorg-seau-capp`
- Prod: `prd-myapp-myorg-seau-capp`

## RBAC Integration

When `envRoles` is provided, the following roles are automatically assigned:

| Role Level | Azure Roles |
|------------|-------------|
| ReadOnly | ContainerApp Reader |
| Contributor | Azure ContainerApps Session Executor |
| Admin | Contributor |

## Builder Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `withEnvironment(props?)` | Configure managed environment | IAppContainerBuilder |
| `withContainer(props)` | Add container configuration | IAppContainerBuilder |
| `withIngress(props)` | Configure ingress settings | IAppContainerBuilder |
| `withScale(props)` | Configure auto-scaling | IAppContainerBuilder |
| `withSecrets(secrets)` | Add secrets | IAppContainerBuilder |
| `withRegistry(registry)` | Configure registry credentials | IAppContainerBuilder |
| `withDapr(props)` | Enable Dapr integration | IAppContainerBuilder |
| `withIdentity(type)` | Configure managed identity | IAppContainerBuilder |
| `lock()` | Prevent deletion | IAppContainerBuilder |
| `build()` | Create resources | ResourceInfo |

## Common Use Cases

### 1. Simple Web App
```typescript
AppContainerBuilder({ name: 'web', group })
  .withEnvironment()
  .withContainer({ image: 'nginx:latest' })
  .withIngress({ external: true, targetPort: 80 })
  .build();
```

### 2. API with Auto-Scaling
```typescript
AppContainerBuilder({ name: 'api', group })
  .withEnvironment()
  .withContainer({
    image: 'myapi:latest',
    resources: { cpu: 1.0, memory: '2Gi' }
  })
  .withIngress({ external: true, targetPort: 8080 })
  .withScale({
    minReplicas: 2,
    maxReplicas: 20,
    rules: [{ name: 'http', http: { metadata: { concurrentRequests: '50' }}}]
  })
  .build();
```

### 3. Microservice with Dapr
```typescript
AppContainerBuilder({ name: 'service', group })
  .withEnvironment()
  .withContainer({ image: 'myservice:latest' })
  .withDapr({
    appId: 'my-service',
    appPort: 8080,
    appProtocol: 'http'
  })
  .withIngress({ external: false, targetPort: 8080 })
  .build();
```

### 4. Private App with VNet Integration
```typescript
AppContainerBuilder({ name: 'internal', group })
  .withEnvironment({
    vnetConfiguration: {
      infrastructureSubnetId: subnet.id,
      internal: true
    }
  })
  .withContainer({ image: 'internal-app:latest' })
  .withIngress({ external: false, targetPort: 8080 })
  .build();
```

## Testing

After building the project, the compiled files are available in:
- `.out-bin/Builder/AppContainerBuilder.js`
- `.out-bin/Builder/AppContainerBuilder.d.ts`

## Documentation

Full documentation is available at:
- [docs/builders/AppContainerBuilder.md](../../docs/builders/AppContainerBuilder.md)

## Examples

Complete examples with multiple scenarios are available at:
- [src/Builder/Samples/AppContainerBuilder.example.ts](./Samples/AppContainerBuilder.example.ts)

## Integration with Other Builders

The AppContainerBuilder works seamlessly with other builders:

```typescript
// With ResourceBuilder for foundation
const foundation = await ResourceBuilder('app').createRG().build();

// With AcrBuilder for container registry
const acr = AcrBuilder({ name: 'registry', group }).build();

// With VnetBuilder for networking
const network = VnetBuilder({ name: 'vnet', group })
  .asHub({ addressSpaces: ['10.0.0.0/16'] })
  .build();

// Deploy Container App
const app = AppContainerBuilder({ name: 'app', group })
  .withEnvironment({
    vnetConfiguration: {
      infrastructureSubnetId: network.subnets['default'].id
    }
  })
  .withRegistry({
    server: acr.instance.loginServer,
    identity: foundation.envUIDInfo!.id
  })
  .withContainer({ image: pulumi.interpolate`${acr.instance.loginServer}/app:latest` })
  .build();
```

## Best Practices

1. ✅ Use managed identities for registry authentication
2. ✅ Store secrets in Key Vault (not inline)
3. ✅ Configure health probes for production apps
4. ✅ Enable zone redundancy in production
5. ✅ Lock production resources with `.lock()`
6. ✅ Use auto-scaling with appropriate limits
7. ✅ Configure ingress based on exposure needs (external vs internal)

## Next Steps

1. Read the complete documentation: [AppContainerBuilder.md](../../docs/builders/AppContainerBuilder.md)
2. Review examples: [AppContainerBuilder.example.ts](./Samples/AppContainerBuilder.example.ts)
3. Check the Pulumi Azure Native docs: [Container Apps](https://www.pulumi.com/registry/packages/azure-native/api-docs/app/containerapp/)

---

**Version**: 0.0.1  
**Added**: November 2025  
**Status**: ✅ Production Ready

