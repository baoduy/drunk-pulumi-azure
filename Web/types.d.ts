import * as pulumi from '@pulumi/pulumi';
import { ConnectionStringType } from '@pulumi/azure-native/types/enums/web';

export interface NameValuePairArgs {
  name: pulumi.Input<string>;
  value: pulumi.Input<string>;
}

export interface ConnStringInfoArgs {
  connectionString: pulumi.Input<string>;
  name: pulumi.Input<string>;
  type?: pulumi.Input<ConnectionStringType>;
}

interface CorsSettingsArgs {
  allowedOrigins?: pulumi.Input<pulumi.Input<string>[]>;
  supportCredentials?: pulumi.Input<boolean>;
}

export interface SiteConfigArgs {
  /**
   * Always On
   */
  alwaysOn?: pulumi.Input<boolean>;
  /**
   * Information about the formal API definition for the web app.
   */
  //apiDefinition?: pulumi.Input<inputs.web.v20150801.ApiDefinitionInfoArgs>;
  /**
   * App Command Line to launch
   */
  appCommandLine?: pulumi.Input<string>;
  /**
   * Application Settings
   */
  appSettings?: pulumi.Input<pulumi.Input<NameValuePairArgs>[]>;
  /**
   * Auto heal enabled
   */
  autoHealEnabled?: pulumi.Input<boolean>;
  /**
   * Auto heal rules
   */
  //autoHealRules?: pulumi.Input<inputs.web.v20150801.AutoHealRulesArgs>;
  /**
   * Auto swap slot name
   */
  //autoSwapSlotName?: pulumi.Input<string>;
  /**
   * Connection strings
   */
  connectionStrings?: pulumi.Input<pulumi.Input<ConnStringInfoArgs>[]>;
  /**
   * Cross-Origin Resource Sharing (CORS) settings.
   */
  cors?: pulumi.Input<CorsSettingsArgs>;
  /**
   * Default documents
   */
  defaultDocuments?: pulumi.Input<pulumi.Input<string>[]>;
  /**
   * Detailed error logging enabled
   */
  detailedErrorLoggingEnabled?: pulumi.Input<boolean>;
  /**
   * Document root
   */
  documentRoot?: pulumi.Input<string>;
  /**
   * This is work around for polymorphic types
   */
  //experiments?: pulumi.Input<inputs.web.v20150801.ExperimentsArgs>;
  /**
   * Handler mappings
   */
  //handlerMappings?: pulumi.Input<pulumi.Input<inputs.web.v20150801.HandlerMappingArgs>[]>;
  /**
   * HTTP logging Enabled
   */
  //httpLoggingEnabled?: pulumi.Input<boolean>;
  /**
   * Resource Id
   */
  //id?: pulumi.Input<string>;
  /**
   * Ip Security restrictions
   */
  //ipSecurityRestrictions?: pulumi.Input<pulumi.Input<inputs.web.v20150801.IpSecurityRestrictionArgs>[]>;

  /**
   * Site limits
   */
  //limits?: pulumi.Input<inputs.web.v20150801.SiteLimitsArgs>;
  /**
   * Site load balancing
   */
  //loadBalancing?: pulumi.Input<enums.web.v20150801.SiteLoadBalancing>;
  /**
   * Local mysql enabled
   */
  //localMySqlEnabled?: pulumi.Input<boolean>;
  /**
   * Resource Location
   */
  //location: pulumi.Input<string>;
  /**
   * HTTP Logs Directory size limit
   */
  //logsDirectorySizeLimit?: pulumi.Input<number>;
  /**
   * Managed pipeline mode
   */
  //managedPipelineMode?: pulumi.Input<enums.web.v20150801.ManagedPipelineMode>;
  /**
   * Site Metadata
   */
  //metadata?: pulumi.Input<pulumi.Input<inputs.web.v20150801.NameValuePairArgs>[]>;
  /**
   * Resource Name
   */
  //name?: pulumi.Input<string>;
  /**
   * Net Framework Version
   */
  //netFrameworkVersion?: pulumi.Input<string>;
  /**
   * Version of Node
   */
  nodeVersion?: pulumi.Input<string>;
  /**
   * Number of workers
   */
  numberOfWorkers?: pulumi.Input<number>;
  /**
   * Version of PHP
   */
  //phpVersion?: pulumi.Input<string>;
  /**
   * Publishing password
   */
  //publishingPassword?: pulumi.Input<string>;
  /**
   * Publishing user name
   */
  //publishingUsername?: pulumi.Input<string>;
  /**
   * Version of Python
   */
  //pythonVersion?: pulumi.Input<string>;
  /**
   * Remote Debugging Enabled
   */
  remoteDebuggingEnabled?: pulumi.Input<boolean>;
  /**
   * Remote Debugging Version
   */
  remoteDebuggingVersion?: pulumi.Input<string>;
  /**
   * Enable request tracing
   */
  requestTracingEnabled?: pulumi.Input<boolean>;
  /**
   * Request tracing expiration time
   */
  requestTracingExpirationTime?: pulumi.Input<string>;
  /**
   * SCM type
   */
  scmType?: pulumi.Input<string>;
  /**
   * Resource tags
   */
  tags?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
  /**
   * Tracing options
   */
  tracingOptions?: pulumi.Input<string>;
  /**
   * Resource type
   */
  //type?: pulumi.Input<string>;
  /**
   * Use 32 bit worker process
   */
  //use32BitWorkerProcess?: pulumi.Input<boolean>;
  /**
   * Virtual applications
   */
  //virtualApplications?: pulumi.Input<pulumi.Input<inputs.web.v20150801.VirtualApplicationArgs>[]>;
  /**
   * Vnet name
   */
  //vnetName?: pulumi.Input<string>;
  /**
   * Web socket enabled.
   */
  webSocketsEnabled?: pulumi.Input<boolean>;
}
