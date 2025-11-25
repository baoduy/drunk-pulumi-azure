import { BuilderProps, IBuilder } from './genericBuilder';
import {
  NetworkPropsType,
  ResourceInfo,
  WithEnvRoles,
  WithLogInfo,
  WithVaultInfo,
} from '../../types';
import { Input } from '@pulumi/pulumi';
import { enums } from '@pulumi/azure-native/types';

export type AppContainerBuilderArgs = BuilderProps &
  WithEnvRoles &
  WithLogInfo &
  WithVaultInfo;

export type AppContainerEnvironmentType = {
  /**
   * Workload profile type to pin for container app execution.
   */
  workloadProfileType?: 'Consumption' | 'D4' | 'D8' | 'D16' | 'D32' | 'E4' | 'E8' | 'E16' | 'E32' | string;

  /**
   * Logs destination configuration.
   */
  logsDestination?: 'log-analytics' | 'azure-monitor';

  /**
   * VNet configuration for the environment.
   */
  vnetConfiguration?: {
    infrastructureSubnetId?: Input<string>;
    internal?: boolean;
  };

  /**
   * Whether to enable zone redundancy.
   */
  zoneRedundant?: boolean;
};

export type AppContainerConfigType = {
  /**
   * Container image to use.
   */
  image: Input<string>;

  /**
   * Container name.
   */
  name?: string;

  /**
   * CPU and memory configuration.
   */
  resources?: {
    cpu?: number;
    memory?: string;
  };

  /**
   * Environment variables for the container.
   */
  env?: Array<{
    name: Input<string>;
    value?: Input<string>;
    secretRef?: Input<string>;
  }>;

  /**
   * Command to run in the container.
   */
  command?: Input<string>[];

  /**
   * Arguments to the command.
   */
  args?: Input<string>[];

  /**
   * Probes for health checks.
   */
  probes?: Array<{
    type?: 'Liveness' | 'Readiness' | 'Startup';
    httpGet?: {
      path: Input<string>;
      port: Input<number>;
      scheme?: 'HTTP' | 'HTTPS';
    };
    initialDelaySeconds?: number;
    periodSeconds?: number;
    failureThreshold?: number;
  }>;
};

export type AppContainerIngressType = {
  /**
   * Whether ingress is enabled.
   */
  external?: boolean;

  /**
   * Target port for ingress.
   */
  targetPort?: number;

  /**
   * Transport protocol (HTTP/HTTP2/TCP).
   */
  transport?: 'auto' | 'http' | 'http2' | 'tcp';

  /**
   * Allow insecure connections.
   */
  allowInsecure?: boolean;

  /**
   * Custom domains.
   */
  customDomains?: Array<{
    name: Input<string>;
    certificateId?: Input<string>;
    bindingType?: 'Disabled' | 'SniEnabled';
  }>;

  /**
   * Traffic weights for revisions.
   */
  traffic?: Array<{
    revisionName?: Input<string>;
    weight?: number;
    latestRevision?: boolean;
    label?: Input<string>;
  }>;
};

export type AppContainerScaleType = {
  /**
   * Minimum number of replicas.
   */
  minReplicas?: number;

  /**
   * Maximum number of replicas.
   */
  maxReplicas?: number;

  /**
   * Scaling rules.
   */
  rules?: Array<{
    name: Input<string>;
    custom?: {
      type: Input<string>;
      metadata?: Record<string, Input<string>>;
    };
    http?: {
      metadata?: {
        concurrentRequests?: Input<string>;
      };
    };
  }>;
};

export type AppContainerSecretsType = {
  name: Input<string>;
  value?: Input<string>;
  keyVaultUrl?: Input<string>;
  identity?: Input<string>;
};

export type AppContainerRegistryType = {
  server: Input<string>;
  username?: Input<string>;
  passwordSecretRef?: Input<string>;
  identity?: Input<string>;
};

export type AppContainerDaprType = {
  /**
   * Dapr application ID.
   */
  appId?: Input<string>;

  /**
   * Dapr application port.
   */
  appPort?: number;

  /**
   * Dapr application protocol.
   */
  appProtocol?: 'http' | 'grpc';

  /**
   * Enable Dapr.
   */
  enabled?: boolean;

  /**
   * HTTP max request size in MB.
   */
  httpMaxRequestSize?: number;

  /**
   * HTTP read buffer size in KB.
   */
  httpReadBufferSize?: number;

  /**
   * Enable API logging.
   */
  enableApiLogging?: boolean;

  /**
   * Log level.
   */
  logLevel?: 'info' | 'debug' | 'warn' | 'error';
};

export interface IAppContainerEnvironmentBuilder {
  /**
   * Configure the Container Apps environment.
   */
  withEnvironment(props?: AppContainerEnvironmentType): IAppContainerBuilder;
}

export interface IAppContainerBuilder extends IBuilder<ResourceInfo> {
  /**
   * Add a container configuration.
   */
  withContainer(props: AppContainerConfigType): IAppContainerBuilder;

  /**
   * Configure ingress settings.
   */
  withIngress(props: AppContainerIngressType): IAppContainerBuilder;

  /**
   * Configure scaling settings.
   */
  withScale(props: AppContainerScaleType): IAppContainerBuilder;

  /**
   * Add secrets to the container app.
   */
  withSecrets(secrets: AppContainerSecretsType[]): IAppContainerBuilder;

  /**
   * Configure container registry.
   */
  withRegistry(registry: AppContainerRegistryType): IAppContainerBuilder;

  /**
   * Configure Dapr.
   */
  withDapr(props: AppContainerDaprType): IAppContainerBuilder;

  /**
   * Configure managed identity.
   */
  withIdentity(type: 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned'): IAppContainerBuilder;

  /**
   * Lock the container app to prevent deletion.
   */
  lock(): IAppContainerBuilder;
}

