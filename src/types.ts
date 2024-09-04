import { CustomResourceOptions, Input, Output, Resource } from '@pulumi/pulumi';
import { IEnvRoleBuilder } from './Builder';

export enum Environments {
  Global = 'global',
  Dev = 'dev',
  Sandbox = 'sandbox',
  Prd = 'prd',
}

/** Omit all the key of OT from T */
export type TypeOmit<T, OT> = Omit<T, keyof OT>;
export type OmitOpts<T> = TypeOmit<T, OptsArgs>;

/**
 * Information about a resource group.
 */
export type ResourceGroupInfo = {
  resourceGroupName: string;
  location?: Input<string>;
};

/**
 * Information about a resource group with an ID.
 */
export type ResourceGroupWithIdInfo = ResourceGroupInfo & {
  id: Input<string>;
};

/**
 * Properties for lockable resources.
 */
export type WithLockable = { lock?: boolean };

/**
 * Properties for resources with dependencies.
 */
export type WithDependsOn = {
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
};

/**
 * Options arguments for resources.
 */
export type OptsArgs = WithDependsOn & {
  importUri?: string;
  ignoreChanges?: string[];
};

/**
 * Arguments for login credentials.
 */
export type LoginArgs = { adminLogin: Input<string>; password: Input<string> };

/**
 * Properties for named types.
 */
export type WithNamedType = { name: string };

/**
 * Properties for resources with an output ID.
 */
export type WithOutputId = { id: Output<string> };

/**
 * Properties for resources with a subscription ID.
 */
export type WithSubId = { subscriptionId?: string };

/**
 * Properties for resources with principal IDs.
 */
export type WithPrincipalId = {
  clientId: Input<string>;
  principalId: Input<string>;
};

/**
 * Properties for resources with environment roles.
 */
export type WithEnvRoles = {
  envRoles?: IEnvRoleBuilder;
  envUIDInfo?: IdentityInfo;
};

/**
 * Properties for resources with encryption.
 */
export type WithEncryption = {
  enableEncryption?: boolean;
};

/**
 * Properties for resources with disk encryption.
 */
export type WithDiskEncryption = {
  diskEncryptionSetId?: Input<string>;
};

/**
 * Properties for resources with vault information.
 */
export type WithVaultInfo = { vaultInfo?: KeyVaultInfo };

/**
 * Properties for resources with resource group information.
 */
export type WithResourceGroupInfo = { group: ResourceGroupInfo };

/**
 * Properties for resources with log information.
 */
export type WithLogInfo = { logInfo?: LogInfo };

/**
 * Properties for resources with encryption information.
 */
export type WithEncryptionInfo = WithEnvRoles & WithVaultInfo & WithEncryption;

/**
 * Properties for resources with Pulumi options.
 */
export type WithPulumiOpts = { opts?: CustomResourceOptions };

/**
 * Arguments for login credentials with environment roles.
 */
export type LoginWithEnvRolesArgs = LoginArgs & WithEnvRoles;

/**
 * Properties for named types with vault information.
 */
export type NamedWithVaultType = WithNamedType & WithVaultInfo;

/**
 * Basic arguments for named resources.
 */
export type NamedBasicArgs = WithNamedType & OptsArgs;

/**
 * Basic arguments for named resources with vault information.
 */
export type NamedWithVaultBasicArgs = NamedWithVaultType & OptsArgs;

/**
 * Arguments for resources.
 */
export type ResourceArgs = WithNamedType & WithResourceGroupInfo;

/**
 * Arguments for resources with vault information.
 */
export type ResourceWithVaultArgs = ResourceArgs & NamedWithVaultType;

/**
 * Arguments for encrypted resources.
 */
export type EncryptResourceArgs = ResourceWithVaultArgs & WithEncryptionInfo;

/**
 * Basic arguments for resources with formattable names.
 */
export type BasicResourceArgs = WithFormattableName & ResourceArgs & OptsArgs;

/**
 * Basic arguments for resources with vault information.
 */
export type BasicResourceWithVaultArgs = WithVaultInfo & BasicResourceArgs;

/**
 * Basic arguments for encrypted resources.
 */
export type BasicEncryptResourceArgs = BasicResourceWithVaultArgs &
  WithEncryptionInfo &
  OptsArgs;

/**
 * Basic resource information.
 */
export type BasicResourceInfo = WithNamedType & WithOutputId;

/**
 * Resource output information.
 */
export type ResourceInfo = BasicResourceInfo & ResourceArgs;

/**
 * Resource information with subscription ID.
 */
export type ResourceInfoWithSub = ResourceInfo & WithSubId;

/**
 * Key vault information.
 */
export type KeyVaultInfo = ResourceInfo;

/**
 * Identity information.
 */
export type IdentityInfo = WithOutputId & WithPrincipalId;

/**
 * Active Directory identity information.
 */
export type AdIdentityInfo = WithNamedType & {
  objectId: Output<string>;
  clientId: Output<string>;
  clientSecret: Output<string> | undefined;
  principalId: Output<string> | undefined;
  principalSecret: Output<string> | undefined;
};

/**
 * Active Directory identity information with instance.
 */
export type AdIdentityInfoWithInstance<TInstance> = AdIdentityInfo &
  WithInstance<TInstance>;

/**
 * Storage connection information.
 */
export type StorageConnectionInfo = {
  primaryConnection?: Output<string>;
  secondaryConnection?: Output<string>;
  primaryKey?: Output<string>;
  secondaryKey?: Output<string>;
};

/**
 * Storage information.
 */
export type StorageInfo = ResourceInfo &
  StorageConnectionInfo & {
    endpoints: {
      blob: string;
      file: string;
      table: string;
    };
  };

/**
 * Application Insights secrets information.
 */
export type AppInsightSecretsInfo = {
  instrumentationKey: Output<string>;
};

/**
 * Application Insights information.
 */
export type AppInsightInfo = ResourceInfo &
  AppInsightSecretsInfo & { connectionString: Output<string> };

/**
 * Log workspace secrets information.
 */
export type LogWorkspaceSecretsInfo = {
  primarySharedKey?: Output<string>;
  secondarySharedKey?: Output<string>;
  workspaceId?: Output<string>;
};

/**
 * Log workspace information.
 */
export type LogWorkspaceInfo = ResourceInfo & LogWorkspaceSecretsInfo;

/**
 * Log information.
 */
export type LogInfo = {
  logWp: LogWorkspaceInfo;
  logStorage: StorageInfo;
  appInsight: AppInsightInfo;
};

/**
 * Interface for identity information with instance.
 */
export interface IdentityInfoWithInstance<InstanceType>
  extends IdentityInfo,
    WithInstance<InstanceType> {}

/**
 * Interface for resources with instance.
 */
export interface WithInstance<InstanceType> {
  instance: InstanceType;
}

/**
 * Interface for basic resource information with instance.
 */
export interface BasicResourceInfoWithInstance<InstanceType>
  extends WithInstance<InstanceType>,
    BasicResourceInfo {}

/**
 * Interface for resource information with instance.
 */
export interface ResourceInfoWithInstance<InstanceType>
  extends WithInstance<InstanceType>,
    ResourceInfo {}

/**
 * Properties for private link.
 */
export type PrivateLinkPropsType = {
  privateIpAddress?: Input<string>;
  /** The Subnet that private links will be created.*/
  subnetIds: Input<string>[];
  /** The extra Vnet that Private DNS Zone will be linked.*/
  extraVnetIds?: Input<string>[];
};

/**
 * Properties for network.
 */
export type NetworkPropsType = {
  subnetId?: Input<string>;
  ipAddresses?: Input<string>[];
  privateLink?: PrivateLinkPropsType;
};

/**
 * Properties for identity role assignment.
 */
export type IdentityRoleAssignment = WithVaultInfo & {
  role?: EnvRoleKeyTypes;
};

/**
 * Interface for replace pattern.
 */
export interface ReplacePattern {
  from: string | RegExp;
  to: string;
}

/**
 * Properties for naming conventions.
 */
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

export type EnvRoleKeyTypes = 'readOnly' | 'contributor' | 'admin';

export type RoleEnableItem = boolean | { [k in EnvRoleKeyTypes]?: boolean };

export type EnvRoleInfoType = { objectId: string; displayName: string };
export type EnvRolesInfo = Record<
  EnvRoleKeyTypes,
  Output<EnvRoleInfoType> | EnvRoleInfoType
>;

export type RoleEnableTypes = {
  enableRGRoles?: RoleEnableItem;
  enableAksRoles?: RoleEnableItem;
  enableStorageRoles?: RoleEnableItem;
  enableIotRoles?: RoleEnableItem;
  enableVaultRoles?: RoleEnableItem;
  /** Container Registry Roles */
  enableACRRoles?: RoleEnableItem;
  enableAppConfig?: RoleEnableItem;
  enableServiceBus?: RoleEnableItem;
  enableSignalR?: RoleEnableItem;
  //enableRedisCache?: RoleEnableItem;
};

export type ListRoleType = Record<EnvRoleKeyTypes, Set<string>>;

/**
 * Type for naming.
 */
export type NamingType = string | { val: string; rule: ConventionProps };

/**
 * Properties for formattable names.
 */
export type WithFormattableName = { name: NamingType };

/**
 * Properties for diagnostic settings.
 */
export type DiagnosticProps = WithNamedType &
  WithDependsOn & {
    logInfo: Partial<Omit<LogInfo, 'appInsight'>>;
    targetResourceId: Input<string>;
    metricsCategories?: string[];
    logsCategories?: string[];
  };
