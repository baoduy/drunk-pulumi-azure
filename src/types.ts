import { CustomResourceOptions, Input, Output, Resource } from '@pulumi/pulumi';
import { EnvRoleKeyTypes } from './AzAd/EnvRoles';
import { IEnvRoleBuilder } from './Builder';

export declare namespace NodeJS {
  interface ProcessEnv {
    DPA_NAMING_DISABLE_PREFIX?: string;
    DPA_NAMING_DISABLE_REGION?: string;
    DPA_NAMING_DISABLE_SUFFIX?: string;
  }
}

/** Omit all the key of OT from T */
export type TypeOmit<T, OT> = Omit<T, keyof OT>;
export type OmitOpts<T> = TypeOmit<T, OptsArgs>;

export type ResourceGroupInfo = {
  resourceGroupName: string;
  location?: Input<string>;
};
export type ResourceGroupWithIdInfo = ResourceGroupInfo & {
  id: Input<string>;
};

export type WithLockable = { lock?: boolean };
export type WithDependsOn = {
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
};
export type OptsArgs = WithDependsOn & {
  importUri?: string;
  ignoreChanges?: string[];
};

export type LoginArgs = { adminLogin: Input<string>; password: Input<string> };
export type WithNamedType = { name: string };
export type WithOutputId = { id: Output<string> };
export type WithSubId = { subscriptionId?: string };
export type WithPrincipalId = { principalId: Input<string> };
export type WithEnvRoles = {
  envRoles?: IEnvRoleBuilder;
  envUIDInfo?: IdentityInfo;
};
export type WithEncryption = {
  enableEncryption?: boolean;
};
export type WithDiskEncryption = {
  diskEncryptionSetId?: Input<string>;
};

export type WithVaultInfo = { vaultInfo?: KeyVaultInfo };
export type WithResourceGroupInfo = { group: ResourceGroupInfo };
export type WithLogInfo = { logInfo?: LogInfo };
export type WithEncryptionInfo = WithEnvRoles & WithVaultInfo & WithEncryption;
export type WithPulumiOpts = { opts?: CustomResourceOptions };

export type LoginWithEnvRolesArgs = LoginArgs & WithEnvRoles;
export type NamedWithVaultType = WithNamedType & WithVaultInfo;
export type NamedBasicArgs = WithNamedType & OptsArgs;
export type NamedWithVaultBasicArgs = NamedWithVaultType & OptsArgs;

export type ResourceArgs = WithNamedType & WithResourceGroupInfo;
export type ResourceWithVaultArgs = ResourceArgs & NamedWithVaultType;
export type EncryptResourceArgs = ResourceWithVaultArgs & WithEncryptionInfo;

export type BasicResourceArgs = ResourceArgs & OptsArgs;
export type BasicResourceWithVaultArgs = NamedWithVaultType & BasicResourceArgs;
export type BasicEncryptResourceArgs = EncryptResourceArgs & OptsArgs;
/** Basic vs Info is Basic doesn't require of group info*/
export type BasicResourceInfo = WithNamedType & WithOutputId;

//Resource Output Info
export type ResourceInfo = BasicResourceInfo & ResourceArgs;
/** Resource Info with Subscription ID */
export type ResourceInfoWithSub = ResourceInfo & WithSubId;
export type KeyVaultInfo = ResourceInfo;
export type IdentityInfo = WithOutputId & WithPrincipalId;
//Log info
export type StorageConnectionInfo = {
  primaryConnection?: Output<string>;
  secondaryConnection?: Output<string>;
  primaryKey?: Output<string>;
  secondaryKey?: Output<string>;
};
export type StorageInfo = ResourceInfo &
  StorageConnectionInfo & {
    endpoints: {
      blob: string;
      file: string;
      table: string;
    };
  };
export type AppInsightSecretsInfo = {
  instrumentationKey?: Output<string>;
};
export type AppInsightInfo = ResourceInfo & AppInsightSecretsInfo;
export type LogWorkspaceSecretsInfo = {
  primarySharedKey?: Output<string>;
  secondarySharedKey?: Output<string>;
  workspaceId?: Output<string>;
};
export type LogWorkspaceInfo = ResourceInfo & LogWorkspaceSecretsInfo;
export type LogInfo = {
  logWp: LogWorkspaceInfo;
  logStorage: StorageInfo;
  appInsight: AppInsightInfo;
};

export interface IdentityInfoWithInstance<InstanceType>
  extends IdentityInfo,
    WithInstance<InstanceType> {}

export interface WithInstance<InstanceType> {
  instance: InstanceType;
}

/** Basic vs Info is Basic doesn't required of group info*/
export interface BasicResourceInfoWithInstance<InstanceType>
  extends WithInstance<InstanceType>,
    BasicResourceInfo {}

export interface ResourceInfoWithInstance<InstanceType>
  extends WithInstance<InstanceType>,
    ResourceInfo {}

export type PrivateLinkPropsType = {
  privateIpAddress?: Input<string>;
  /** The Subnet that private links will be created.*/
  subnetIds: Input<string>[];
  /** The extra Vnet that Private DNS Zone will be linked.*/
  extraVnetIds?: Input<string>[];
  type?: string;
};

export type NetworkPropsType = {
  subnetId?: Input<string>;
  ipAddresses?: Input<string>[];
  privateLink?: PrivateLinkPropsType;
};

export type IdentityRoleAssignment = WithVaultInfo & {
  role?: EnvRoleKeyTypes;
};

// export type GlobalResourceInfo = ResourceInfo & {
//   name?: Input<string>;
//   /**The provider name of the resource ex: "Microsoft.Network/virtualNetworks" or "Microsoft.Network/networkSecurityGroups"*/
//   provider?: string;
//   group: ResourceGroupInfo;
//   subscriptionId?: Input<string>;
// };

export interface ReplacePattern {
  from: string | RegExp;
  to: string;
}

export type ConventionProps = {
  prefix?: string;
  suffix?: string;
  /**Whether include the Azure Region name at the end of the name or not*/
  region?: string;
  /**Whether include the organization name at the end of the name or not*/
  includeOrgName?: boolean;
  /**Remove number from the name*/
  cleanName?: boolean;
  /** the max length of the name*/
  maxLength?: number;
  /**The regex to replace specials characters from the name*/
  //replaceRegex?: string;
  replaces?: ReplacePattern[];
};

export type DiagnosticProps = WithNamedType &
  WithDependsOn & {
    logInfo: Partial<Omit<LogInfo, 'appInsight'>>;
    targetResourceId: Input<string>;
    metricsCategories?: string[];
    logsCategories?: string[];
  };
