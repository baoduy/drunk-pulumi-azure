# Examples

This directory contains usage examples for the drunk-pulumi-azure builders.

## AppContainerBuilder Example

**File**: `AppContainerBuilder.example.ts`

This example demonstrates how to use the AppContainerBuilder to create Azure Container Apps with various configurations:

1. **Simple Container App** - Basic web app with ingress
2. **Scalable API** - Production-ready app with auto-scaling, health probes, and managed identity
3. **Microservice with Dapr** - Dapr-enabled microservice for distributed applications

### Usage

These examples are for reference only and are not compiled with the main library. To use them:

```bash
# Copy the example to your Pulumi project
cp examples/AppContainerBuilder.example.ts your-project/

# Update the import to use the installed package
# Change: import { ... } from '@drunk-pulumi/azure';
# To match your package installation

# Use in your Pulumi program
pulumi up
```

## Note

The examples directory is excluded from TypeScript compilation (see `tsconfig.json`). This keeps the published package clean while providing helpful reference implementations.

