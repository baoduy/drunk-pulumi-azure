import * as pulumi from "@pulumi/pulumi";
import { ConnectionStringType } from "@pulumi/azure-native/types/enums/web";

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
  alwaysOn?: pulumi.Input<boolean>;
  appCommandLine?: pulumi.Input<string>;
  appSettings?: pulumi.Input<pulumi.Input<NameValuePairArgs>[]>;
  autoHealEnabled?: pulumi.Input<boolean>;
  connectionStrings?: pulumi.Input<pulumi.Input<ConnStringInfoArgs>[]>;
  cors?: pulumi.Input<CorsSettingsArgs>;
  defaultDocuments?: pulumi.Input<pulumi.Input<string>[]>;
  detailedErrorLoggingEnabled?: pulumi.Input<boolean>;
  documentRoot?: pulumi.Input<string>;
  nodeVersion?: pulumi.Input<string>;
  numberOfWorkers?: pulumi.Input<number>;
  remoteDebuggingEnabled?: pulumi.Input<boolean>;
  remoteDebuggingVersion?: pulumi.Input<string>;
  requestTracingEnabled?: pulumi.Input<boolean>;
  requestTracingExpirationTime?: pulumi.Input<string>;
  scmType?: pulumi.Input<string>;
  tracingOptions?: pulumi.Input<string>;
  webSocketsEnabled?: pulumi.Input<boolean>;
  linuxFxVersion?: pulumi.Input<string>;
}
