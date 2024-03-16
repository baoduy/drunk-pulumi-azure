import { Input, Output, Resource } from '@pulumi/pulumi';
import * as authorization from '@pulumi/azure-native/authorization';
import { DiagnosticSetting } from '@pulumi/azure-native/aadiam/diagnosticSetting';

export interface BasicArgs {
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export interface ResourceGroupInfo {
  resourceGroupName: string;
  location?: Input<string>;
}

export interface ConventionProps {
  prefix?: string;
  suffix?: string;
  /**Whether include the organization name at the end of the name or not*/
  includeOrgName?: boolean;
}

export interface PrivateLinkProps {
  subnetId: Input<string>;
  useGlobalDnsZone?: boolean;
}

export interface NetworkRulesProps {
  subnetId?: Input<string>;
  privateLink?: Omit<PrivateLinkProps, 'subnetId'>;
  ipAddresses?: Input<string>[];
}

export interface BasicMonitorArgs extends BasicArgs {
  logWpId?: Input<string>;
  logStorageId?: Input<string>;
}

export interface DiagnosticProps extends BasicMonitorArgs {
  name: string;
  targetResourceId: Input<string>;

  metricsCategories?: string[];
  logsCategories?: string[];
}

export interface ResourceInfo {
  resourceName: string;
  group: ResourceGroupInfo;
  id: Output<string>;
}

export interface ApimInfo extends Omit<ResourceInfo, 'resourceName' | 'id'> {
  serviceName: string;
}

export interface BasicResourceArgs extends BasicArgs {
  name: string;
  group: ResourceGroupInfo;
}

export interface DefaultResourceArgs extends BasicArgs {
  lock?: boolean;
  monitoring?: Omit<DiagnosticProps, 'name' | 'targetResourceId'>;
  importUri?: string;
  ignoreChanges?: string[];
}

export interface BasicResourceResultProps<TClass> {
  name: string;
  resource: TClass;
}

export interface ResourceResultProps<TClass>
  extends BasicResourceResultProps<TClass> {
  locker?: authorization.ManagementLockByScope;
  diagnostic?: DiagnosticSetting;
}

export interface KeyVaultInfo {
  name: string;
  group: ResourceGroupInfo;
  id: Input<string>;
}

export interface AppInsightInfo extends ResourceInfo {
  instrumentationKey: Input<string>;
}
