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
export type LockableType = { lock?: boolean };

export type ResourceGroupInfo = {
  resourceGroupName: string;
  location?: Input<string>;
};
export type ResourceGroupWithIdInfo = ResourceGroupInfo & {
  id: Input<string>;
};

export type OptsArgs = {
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
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

export type WithVaultInfo = { vaultInfo?: KeyVaultInfo };
export type WithResourceGroupInfo = { group: ResourceGroupInfo };
export type WithEncryptionInfo = WithEnvRoles &
  WithVaultInfo & { enableEncryption?: boolean };
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
/** Basic vs Info is Basic doesn't required of group info*/
export type BasicResourceInfo = WithNamedType & WithOutputId;

//Resource Output Info
export type ResourceInfo = BasicResourceInfo & ResourceArgs;
export type ResourceInfoWithSub = ResourceInfo & WithSubId;
export type KeyVaultInfo = ResourceInfo;
export type IdentityInfo = WithOutputId & WithPrincipalId;
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

export type ConventionProps = {
  prefix?: string;
  suffix?: string;
  /**Whether include the Azure Region name at the end of the name or not*/
  region?: string;
  /**Whether include the organization name at the end of the name or not*/
  includeOrgName?: boolean;
};

export type BasicMonitorArgs = OptsArgs & {
  logWpId?: Input<string>;
  logStorageId?: Input<string>;
};

export interface DiagnosticProps extends WithNamedType, BasicMonitorArgs {
  targetResourceId: Input<string>;
  metricsCategories?: string[];
  logsCategories?: string[];
}
