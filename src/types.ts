import { Input, Output, Resource } from '@pulumi/pulumi';
import * as authorization from '@pulumi/azure-native/authorization';
import { DiagnosticSetting } from '@pulumi/azure-native/aadiam/diagnosticSetting';
import { EnvRoleKeyTypes } from './AzAd/EnvRoles';

export declare namespace NodeJS {
  interface ProcessEnv {
    DPA_NAMING_DISABLE_PREFIX?: string;
    DPA_NAMING_DISABLE_REGION?: string;
    DPA_NAMING_DISABLE_SUFFIX?: string;
  }
}

export type NamedResourceType = {
  name: string;
};

export interface ResourceInfoArg {
  /**If name and provider of the resource is not provided then the Id will be resource group Id*/
  name?: Input<string>;
  /**The provider name of the resource ex: "Microsoft.Network/virtualNetworks" or "Microsoft.Network/networkSecurityGroups"*/
  provider?: string;
  group: ResourceGroupInfo;
  subscriptionId?: Input<string>;
}

export type BasicArgs = {
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
  importUri?: string;
  ignoreChanges?: string[];
};

export type ResourceGroupInfo = {
  resourceGroupName: string;
  location?: Input<string>;
};

export type ConventionProps = {
  prefix?: string;
  suffix?: string;
  /**Whether include the Azure Region name at the end of the name or not*/
  region?: string;
  /**Whether include the organization name at the end of the name or not*/
  includeOrgName?: boolean;
};

export type BasicMonitorArgs = BasicArgs & {
  logWpId?: Input<string>;
  logStorageId?: Input<string>;
};

export interface DiagnosticProps extends BasicMonitorArgs {
  name: string;
  targetResourceId: Input<string>;

  metricsCategories?: string[];
  logsCategories?: string[];
}

export type ResourceType = {
  name: string;
  groupName: string;
  formattedName?: boolean;
};

export type ResourceInfo = NamedResourceType & {
  group: ResourceGroupInfo;
  id: Output<string>;
};

export type KeyVaultInfo = ResourceInfo;

export interface ResourceInfoWithInstance<InstanceType> extends ResourceInfo {
  instance: InstanceType;
}

export interface BasicResourceArgs extends BasicArgs {
  name: string;
  group: ResourceGroupInfo;
}

export interface DefaultResourceArgs extends BasicArgs {
  monitoring?: Omit<DiagnosticProps, 'name' | 'targetResourceId'>;
}

export type PrivateLinkPropsType = {
  subnetIds: Input<string>[];
  type?: string;
};

export type NetworkPropsType = {
  subnetId?: Input<string>;
  ipAddresses?: Input<string>[];
  privateLink?: PrivateLinkPropsType;
};

export interface BasicResourceResultProps<TClass> extends NamedResourceType {
  resource: TClass;
}

export interface ResourceResultProps<TClass>
  extends BasicResourceResultProps<TClass> {
  locker?: authorization.ManagementLockByScope;
  diagnostic?: DiagnosticSetting;
}

export type IdentityRoleAssignment = {
  vaultInfo?: KeyVaultInfo;
  roles?: Array<{ name: string; scope: Input<string> }>;
  envRole?: EnvRoleKeyTypes;
};
