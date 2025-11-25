import * as app from '@pulumi/azure-native/app';
import { Output } from '@pulumi/pulumi';
import {
  AppContainerBuilderArgs,
  AppContainerConfigType,
  AppContainerDaprType,
  AppContainerEnvironmentType,
  AppContainerIngressType,
  AppContainerRegistryType,
  AppContainerScaleType,
  AppContainerSecretsType,
  Builder,
  IAppContainerBuilder,
  IAppContainerEnvironmentBuilder,
} from './types';
import { ResourceInfo } from '../types';
import { isPrd, naming } from '../Common';
import { grantEnvRolesAccess } from '../AzAd';
import ResourceCreator from '../Core/ResourceCreator';

/**
 * AppContainerBuilder class for creating and configuring Azure Container Apps.
 * This class implements the Builder pattern for Container Apps configuration including
 * managed environments, ingress, scaling, Dapr integration, and secrets management.
 * @extends Builder<ResourceInfo>
 * @implements IAppContainerEnvironmentBuilder
 * @implements IAppContainerBuilder
 */
class AppContainerBuilder
  extends Builder<ResourceInfo>
  implements IAppContainerEnvironmentBuilder, IAppContainerBuilder
{
  private readonly _instanceName: string;
  private readonly _envName: string;

  // Resource instances
  private _environmentInstance: Output<string> | undefined = undefined;
  private _containerAppInstance: Output<string> | undefined = undefined;

  // Configuration properties
  private _environmentProps: AppContainerEnvironmentType = {};
  private _containers: AppContainerConfigType[] = [];
  private _ingressProps: AppContainerIngressType | undefined = undefined;
  private _scaleProps: AppContainerScaleType | undefined = undefined;
  private _secrets: AppContainerSecretsType[] = [];
  private _registries: AppContainerRegistryType[] = [];
  private _daprProps: AppContainerDaprType | undefined = undefined;
  private _identityType:
    | 'SystemAssigned'
    | 'UserAssigned'
    | 'SystemAssigned,UserAssigned'
    | undefined = undefined;
  private _lock: boolean = false;

  /**
   * Creates an instance of AppContainerBuilder.
   * @param {AppContainerBuilderArgs} args - The arguments for building the Container App.
   */
  constructor(private args: AppContainerBuilderArgs) {
    super(args);
    this._instanceName = naming.getContainerAppName(args.name);
    this._envName = naming.getContainerAppEnvName(`${args.name}-env`);
  }

  /**
   * Configure the Container Apps managed environment.
   * @param {AppContainerEnvironmentType} props - The environment configuration.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public withEnvironment(
    props: AppContainerEnvironmentType = {},
  ): IAppContainerBuilder {
    this._environmentProps = props;
    return this;
  }

  /**
   * Add a container configuration to the Container App.
   * @param {AppContainerConfigType} props - The container configuration.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public withContainer(props: AppContainerConfigType): IAppContainerBuilder {
    this._containers.push(props);
    return this;
  }

  /**
   * Configure ingress settings for the Container App.
   * @param {AppContainerIngressType} props - The ingress configuration.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public withIngress(props: AppContainerIngressType): IAppContainerBuilder {
    this._ingressProps = props;
    return this;
  }

  /**
   * Configure scaling settings for the Container App.
   * @param {AppContainerScaleType} props - The scale configuration.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public withScale(props: AppContainerScaleType): IAppContainerBuilder {
    this._scaleProps = props;
    return this;
  }

  /**
   * Add secrets to the Container App.
   * @param {AppContainerSecretsType[]} secrets - Array of secrets.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public withSecrets(secrets: AppContainerSecretsType[]): IAppContainerBuilder {
    this._secrets.push(...secrets);
    return this;
  }

  /**
   * Configure container registry credentials.
   * @param {AppContainerRegistryType} registry - The registry configuration.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public withRegistry(registry: AppContainerRegistryType): IAppContainerBuilder {
    this._registries.push(registry);
    return this;
  }

  /**
   * Configure Dapr integration.
   * @param {AppContainerDaprType} props - The Dapr configuration.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public withDapr(props: AppContainerDaprType): IAppContainerBuilder {
    this._daprProps = props;
    return this;
  }

  /**
   * Configure managed identity for the Container App.
   * @param {'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned'} type - The identity type.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public withIdentity(
    type: 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned',
  ): IAppContainerBuilder {
    this._identityType = type;
    return this;
  }

  /**
   * Lock the Container App to prevent accidental deletion.
   * @returns {IAppContainerBuilder} The current builder instance.
   */
  public lock(): IAppContainerBuilder {
    this._lock = true;
    return this;
  }

  /**
   * Build the managed environment for Container Apps.
   * @private
   */
  private buildEnvironment() {
    const { group, logInfo, dependsOn } = this.args;
    const { vnetConfiguration, workloadProfileType, logsDestination, zoneRedundant } =
      this._environmentProps;

    // Prepare logs configuration
    const logsConfig = logInfo
      ? {
          logAnalyticsConfiguration: {
            customerId: logInfo.logWp.workspaceId,
            sharedKey: logInfo.logWp.primarySharedKey,
          },
          appLogsConfiguration: {
            destination: logsDestination || 'log-analytics',
          },
        }
      : undefined;

    // Create the managed environment
    const { resource: environment } = ResourceCreator(app.ManagedEnvironment, {
      ...group,
      environmentName: this._envName,
      vnetConfiguration: vnetConfiguration
        ? {
            infrastructureSubnetId: vnetConfiguration.infrastructureSubnetId,
            internal: vnetConfiguration.internal ?? false,
          }
        : undefined,
      workloadProfiles: workloadProfileType
        ? [
            {
              name: 'Consumption',
              workloadProfileType: workloadProfileType,
            },
          ]
        : undefined,
      zoneRedundant: zoneRedundant ?? isPrd,
      ...logsConfig,
      dependsOn,
    });

    this._environmentInstance = environment.id;
  }

  /**
   * Build the Container App.
   * @private
   */
  private buildContainerApp() {
    const { group } = this.commonProps;
    const { envUIDInfo } = this.args;

    if (!this._environmentInstance) {
      throw new Error(
        `${this._instanceName}: Environment must be created before Container App`,
      );
    }

    if (this._containers.length === 0) {
      throw new Error(
        `${this._instanceName}: At least one container must be configured`,
      );
    }

    // Prepare identity configuration
    let identity:
      | {
          type: app.ManagedServiceIdentityType;
          userAssignedIdentities?: string[];
        }
      | undefined = undefined;

    if (this._identityType) {
      if (this._identityType === 'SystemAssigned') {
        identity = { type: app.ManagedServiceIdentityType.SystemAssigned };
      } else if (this._identityType === 'UserAssigned' && envUIDInfo) {
        identity = {
          type: app.ManagedServiceIdentityType.UserAssigned,
          userAssignedIdentities: [envUIDInfo.id as any],
        };
      } else if (this._identityType === 'SystemAssigned,UserAssigned' && envUIDInfo) {
        identity = {
          type: app.ManagedServiceIdentityType.SystemAssigned_UserAssigned,
          userAssignedIdentities: [envUIDInfo.id as any],
        };
      }
    }

    // Prepare configuration
    const configuration: any = {
      secrets: this._secrets.map((s) => ({
        name: s.name,
        value: s.value,
        keyVaultUrl: s.keyVaultUrl,
        identity: s.identity,
      })),
      registries:
        this._registries.length > 0
          ? this._registries.map((r) => ({
              server: r.server,
              username: r.username,
              passwordSecretRef: r.passwordSecretRef,
              identity: r.identity,
            }))
          : undefined,
      ingress: this._ingressProps
        ? {
            external: this._ingressProps.external ?? false,
            targetPort: this._ingressProps.targetPort,
            transport: this._ingressProps.transport || 'auto',
            allowInsecure: this._ingressProps.allowInsecure ?? false,
            customDomains: this._ingressProps.customDomains,
            traffic: this._ingressProps.traffic,
          }
        : undefined,
      dapr: this._daprProps
        ? {
            appId: this._daprProps.appId,
            appPort: this._daprProps.appPort,
            appProtocol: this._daprProps.appProtocol,
            enabled: this._daprProps.enabled ?? true,
            httpMaxRequestSize: this._daprProps.httpMaxRequestSize,
            httpReadBufferSize: this._daprProps.httpReadBufferSize,
            enableApiLogging: this._daprProps.enableApiLogging,
            logLevel: this._daprProps.logLevel,
          }
        : undefined,
    };

    // Prepare template
    const template: any = {
      containers: this._containers.map((c) => ({
        name: c.name || 'main',
        image: c.image,
        resources: c.resources
          ? {
              cpu: c.resources.cpu ?? 0.5,
              memory: c.resources.memory ?? '1Gi',
            }
          : { cpu: 0.5, memory: '1Gi' },
        env: c.env,
        command: c.command,
        args: c.args,
        probes: c.probes?.map((p) => ({
          type: p.type,
          httpGet: p.httpGet
            ? {
                path: p.httpGet.path,
                port: p.httpGet.port,
                scheme: p.httpGet.scheme || 'HTTP',
              }
            : undefined,
          initialDelaySeconds: p.initialDelaySeconds,
          periodSeconds: p.periodSeconds,
          failureThreshold: p.failureThreshold,
        })),
      })),
      scale: this._scaleProps
        ? {
            minReplicas: this._scaleProps.minReplicas ?? 0,
            maxReplicas: this._scaleProps.maxReplicas ?? 10,
            rules: this._scaleProps.rules?.map((r) => ({
              name: r.name,
              custom: r.custom
                ? {
                    type: r.custom.type,
                    metadata: r.custom.metadata,
                  }
                : undefined,
              http: r.http
                ? {
                    metadata: r.http.metadata,
                  }
                : undefined,
            })),
          }
        : undefined,
    };

    // Create the Container App
    const { resource: containerApp, locker } = ResourceCreator(app.ContainerApp, {
      ...group,
      ...this.commonProps,
      containerAppName: this._instanceName,
      managedEnvironmentId: this._environmentInstance,
      identity,
      configuration,
      template,
      lock: this._lock,
    });

    this._containerAppInstance = containerApp.id;

    // Grant environment roles if configured
    if (this.args.envRoles) {
      grantEnvRolesAccess({
        name: this._instanceName,
        scope: containerApp.id,
        envRoles: this.args.envRoles,
        enableContainerAppRoles: true,
      });
    }
  }

  /**
   * Build the Container App and its environment.
   * @returns {ResourceInfo} The resource information for the created Container App.
   */
  public build(): ResourceInfo {
    this.buildEnvironment();
    this.buildContainerApp();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._containerAppInstance!,
    };
  }
}

/**
 * Factory function to create an AppContainerBuilder instance.
 * @param {AppContainerBuilderArgs} args - The arguments for building the Container App.
 * @returns {IAppContainerEnvironmentBuilder} A new AppContainerBuilder instance.
 * @example
 * ```typescript
 * const containerApp = AppContainerBuilder({ name: 'myapp', group })
 *   .withEnvironment({ workloadProfileType: 'Consumption' })
 *   .withContainer({
 *     image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest',
 *     resources: { cpu: 0.5, memory: '1Gi' }
 *   })
 *   .withIngress({ external: true, targetPort: 80 })
 *   .withScale({ minReplicas: 1, maxReplicas: 10 })
 *   .build();
 * ```
 */
export default function (
  args: AppContainerBuilderArgs,
): IAppContainerEnvironmentBuilder {
  return new AppContainerBuilder(args);
}

