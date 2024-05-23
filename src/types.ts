import { Input, Output, Resource } from "@pulumi/pulumi";
import * as authorization from "@pulumi/azure-native/authorization";
import { DiagnosticSetting } from "@pulumi/azure-native/aadiam/diagnosticSetting";
import * as pulumi from "@pulumi/pulumi";
import { input as inputs, enums } from "@pulumi/azure-native/types";

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
  /**Whether include the Azure Region name at the end of the name or not*/
  includeRegion?: boolean;
  /**Whether include the organization name at the end of the name or not*/
  includeOrgName?: boolean;
}

export interface PrivateLinkProps {
  subnetId: Input<string>;
  useGlobalDnsZone?: boolean;
}

export interface NetworkRulesProps {
  subnetId?: Input<string>;
  privateLink?: Omit<PrivateLinkProps, "subnetId">;
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

export interface ApimInfo extends Omit<ResourceInfo, "resourceName" | "id"> {
  serviceName: string;
}

export interface BasicResourceArgs extends BasicArgs {
  name: string;
  group: ResourceGroupInfo;
}

export interface DefaultResourceArgs extends BasicArgs {
  lock?: boolean;
  monitoring?: Omit<DiagnosticProps, "name" | "targetResourceId">;
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

export interface RouteArgs {
  /**
   * The destination CIDR to which the route applies.
   */
  addressPrefix?: pulumi.Input<string>;
  /**
   * A value indicating whether this route overrides overlapping BGP routes regardless of LPM.
   */
  hasBgpOverride?: pulumi.Input<boolean>;
  /**
   * The IP address packets should be forwarded to. Next hop values are only allowed in routes where the next hop type is VirtualAppliance.
   */
  nextHopIpAddress?: pulumi.Input<string>;
  /**
   * The type of Azure hop the packet should be sent to.
   */
  nextHopType: pulumi.Input<string | enums.network.RouteNextHopType>;

  /**
   * The type of the resource.
   */
  type?: pulumi.Input<string>;
}

/**
 * Network security rule.
 */
export interface CustomSecurityRuleArgs {
  /**
   * The network traffic is allowed or denied.
   */
  access: pulumi.Input<string | enums.network.SecurityRuleAccess>;
  /**
   * A description for this rule. Restricted to 140 chars.
   */
  description?: pulumi.Input<string>;
  /**
   * The destination address prefix. CIDR or destination IP range. Asterisk '*' can also be used to match all source IPs. Default tags such as 'VirtualNetwork', 'AzureLoadBalancer' and 'Internet' can also be used.
   */
  destinationAddressPrefix?: pulumi.Input<string>;
  /**
   * The destination address prefixes. CIDR or destination IP ranges.
   */
  destinationAddressPrefixes?: pulumi.Input<pulumi.Input<string>[]>;
  /**
   * The application security group specified as destination.
   */
  destinationApplicationSecurityGroups?: pulumi.Input<
    pulumi.Input<inputs.network.ApplicationSecurityGroupArgs>[]
  >;
  /**
   * The destination port or range. Integer or range between 0 and 65535. Asterisk '*' can also be used to match all ports.
   */
  destinationPortRange?: pulumi.Input<string>;
  /**
   * The destination port ranges.
   */
  destinationPortRanges?: pulumi.Input<pulumi.Input<string>[]>;
  /**
   * The direction of the rule. The direction specifies if rule will be evaluated on incoming or outgoing traffic.
   */
  direction: pulumi.Input<string | enums.network.SecurityRuleDirection>;
  /**
   * The name of the resource that is unique within a resource group. This name can be used to access the resource.
   */
  name?: pulumi.Input<string>;
  /**
   * The priority of the rule. The value can be between 100 and 4096. The priority number must be unique for each rule in the collection. The lower the priority number, the higher the priority of the rule.
   */
  priority?: pulumi.Input<number>;
  /**
   * Network protocol this rule applies to.
   */
  protocol: pulumi.Input<string | enums.network.SecurityRuleProtocol>;
  /**
   * The CIDR or source IP range. Asterisk '*' can also be used to match all source IPs. Default tags such as 'VirtualNetwork', 'AzureLoadBalancer' and 'Internet' can also be used. If this is an ingress rule, specifies where network traffic originates from.
   */
  sourceAddressPrefix?: pulumi.Input<string>;
  /**
   * The CIDR or source IP ranges.
   */
  sourceAddressPrefixes?: pulumi.Input<pulumi.Input<string>[]>;
  /**
   * The application security group specified as source.
   */
  sourceApplicationSecurityGroups?: pulumi.Input<
    pulumi.Input<inputs.network.ApplicationSecurityGroupArgs>[]
  >;
  /**
   * The source port or range. Integer or range between 0 and 65535. Asterisk '*' can also be used to match all ports.
   */
  sourcePortRange?: pulumi.Input<string>;
  /**
   * The source port ranges.
   */
  sourcePortRanges?: pulumi.Input<pulumi.Input<string>[]>;
  /**
   * The type of the resource.
   */
  type?: pulumi.Input<string>;
}
