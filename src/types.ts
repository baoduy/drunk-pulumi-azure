import { Input, Output, Resource } from '@pulumi/pulumi';
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
export type LoginWithEnvRolesArgs = LoginArgs & { envRoles?: IEnvRoleBuilder };
export type NamedType = { name: string };
export type NamedWithVaultType = NamedType & { vaultInfo?: KeyVaultInfo };
export type NamedBasicArgs = NamedType & OptsArgs;
export type NamedWithVaultBasicArgs = NamedWithVaultType & OptsArgs;

export type ResourceArgs = NamedType & { group: ResourceGroupInfo };
export type ResourceWithVaultArgs = ResourceArgs & NamedWithVaultType;
export type EncryptResourceArgs = ResourceWithVaultArgs & {
  enableEncryption?: boolean;
  envRoles?: IEnvRoleBuilder;
};

export type BasicResourceArgs = ResourceArgs & OptsArgs;
export type BasicResourceWithVaultArgs = NamedWithVaultType & BasicResourceArgs;
export type BasicEncryptResourceArgs = EncryptResourceArgs & OptsArgs;
export type BasicResourceInfo = NamedType & { id: Output<string> };

//Resource Output Info
export type ResourceInfo = BasicResourceInfo & ResourceArgs;
export type ResourceInfoWithSub = ResourceInfo & {
  subscriptionId?: string;
};
export type KeyVaultInfo = ResourceInfo;
export type IdentityInfo = ResourceInfo & { principalId: string };

export interface BasicResourceInfoWithInstance<InstanceType>
  extends BasicResourceInfo {
  instance: InstanceType;
}

export interface ResourceInfoWithInstance<InstanceType> extends ResourceInfo {
  instance: InstanceType;
}

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

export type IdentityRoleAssignment = {
  vaultInfo?: KeyVaultInfo;
  //roles?: Array<NamedType & { scope: Input<string> }>;
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

export interface DiagnosticProps extends NamedType, BasicMonitorArgs {
  targetResourceId: Input<string>;
  metricsCategories?: string[];
  logsCategories?: string[];
}
