/**
 * Example usage of AppContainerBuilder
 *
 * This example demonstrates how to create an Azure Container App
 * with various configurations including ingress, scaling, and Dapr.
 */

import { AppContainerBuilder, ResourceBuilder } from '@drunk-pulumi/azure';

async function main() {
  // Create foundation resources
  const foundation = await ResourceBuilder('containerapp-demo')
    .createRoles()
    .createRG({ enableVaultRoles: true })
    .createVault()
    .createEnvUID()
    .build();

  // Example 1: Simple Container App
  const simpleApp = AppContainerBuilder({
    name: 'hello-world',
    group: foundation.group!,
  })
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

  // Example 2: Container App with Auto-scaling
  const scalableApp = AppContainerBuilder({
    name: 'scalable-api',
    group: foundation.group!,
    vaultInfo: foundation.vaultInfo,
    envUIDInfo: foundation.envUIDInfo,
  })
    .withEnvironment({
      workloadProfileType: 'Consumption',
      zoneRedundant: true
    })
    .withContainer({
      image: 'myregistry.azurecr.io/api:latest',
      resources: { cpu: 1.0, memory: '2Gi' },
      env: [
        { name: 'NODE_ENV', value: 'production' }
      ],
      probes: [{
        type: 'Liveness',
        httpGet: {
          path: '/health',
          port: 8080
        },
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
        name: 'http-scaling',
        http: {
          metadata: {
            concurrentRequests: '50'
          }
        }
      }]
    })
    .withIdentity('SystemAssigned')
    .lock()
    .build();

  // Example 3: Microservice with Dapr
  const daprService = AppContainerBuilder({
    name: 'dapr-service',
    group: foundation.group!,
    vaultInfo: foundation.vaultInfo,
  })
    .withEnvironment()
    .withContainer({
      image: 'myregistry.azurecr.io/dapr-app:latest',
      resources: { cpu: 0.5, memory: '1Gi' }
    })
    .withDapr({
      appId: 'my-dapr-app',
      appPort: 8080,
      appProtocol: 'http',
      enableApiLogging: true,
      logLevel: 'info'
    })
    .withIngress({
      external: false,
      targetPort: 8080
    })
    .build();

  return {
    simpleApp,
    scalableApp,
    daprService,
  };
}

// Export the results
export = main();

