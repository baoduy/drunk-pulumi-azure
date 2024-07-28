import { enums, input as inputs } from '@pulumi/azure-native/types';
import { Input, Output } from '@pulumi/pulumi';
import * as pulumi from '@pulumi/pulumi';
import { NamedType } from '../types';

export type VnetInfoType = {
  vnetName: Input<string>;
  resourceGroupName: Input<string>;
  subscriptionId?: Input<string>;
};

export interface RouteArgs {
  name?: Input<string>;
  addressPrefix?: pulumi.Input<string>;
  hasBgpOverride?: pulumi.Input<boolean>;
  nextHopIpAddress?: pulumi.Input<string>;
  nextHopType: pulumi.Input<string | enums.network.RouteNextHopType>;
}

export interface CustomSecurityRuleArgs {
  access: pulumi.Input<string | enums.network.SecurityRuleAccess>;
  description?: pulumi.Input<string>;
  destinationAddressPrefix?: pulumi.Input<string>;
  destinationAddressPrefixes?: pulumi.Input<pulumi.Input<string>[]>;
  destinationApplicationSecurityGroups?: pulumi.Input<
    pulumi.Input<inputs.network.ApplicationSecurityGroupArgs>[]
  >;
  destinationPortRange?: pulumi.Input<string>;
  destinationPortRanges?: pulumi.Input<pulumi.Input<string>[]>;
  direction: pulumi.Input<string | enums.network.SecurityRuleDirection>;
  name?: pulumi.Input<string>;
  priority: pulumi.Input<number>;
  protocol: pulumi.Input<string | enums.network.SecurityRuleProtocol>;
  sourceAddressPrefix?: pulumi.Input<string>;
  sourceAddressPrefixes?: pulumi.Input<pulumi.Input<string>[]>;
  sourceApplicationSecurityGroups?: pulumi.Input<
    pulumi.Input<inputs.network.ApplicationSecurityGroupArgs>[]
  >;
  sourcePortRange?: pulumi.Input<string>;
  sourcePortRanges?: pulumi.Input<pulumi.Input<string>[]>;
  type?: pulumi.Input<string>;
}

export interface NatRuleArgs {
  description?: Input<string>;
  destinationAddresses?: Input<Input<string>[]>;
  destinationPorts?: Input<Input<string>[]>;
  ipProtocols?: Input<
    Input<string | enums.network.FirewallPolicyRuleNetworkProtocol>[]
  >;
  name?: Input<string>;
  ruleType: Input<'NatRule'>;
  sourceAddresses?: Input<Input<string>[]>;
  sourceIpGroups?: Input<Input<string>[]>;
  translatedAddress?: Input<string>;
  translatedFqdn?: Input<string>;
  translatedPort?: Input<string>;
}

interface FirewallPolicyRuleApplicationProtocolArgs {
  port?: pulumi.Input<number>;
  protocolType?: pulumi.Input<
    string | enums.network.AzureFirewallApplicationRuleProtocolType
  >;
}

export interface NetworkRuleArgs {
  description?: Input<string>;
  /**
   * List of destination IP addresses or Service Tags.
   */
  destinationAddresses?: Input<Input<string>[]>;
  destinationFqdns?: Input<Input<string>[]>;
  destinationIpGroups?: Input<Input<string>[]>;
  destinationPorts?: Input<Input<string>[]>;
  ipProtocols?: Input<
    Input<string | enums.network.FirewallPolicyRuleNetworkProtocol>[]
  >;
  name?: Input<string>;
  ruleType: Input<'NetworkRule'>;
  sourceAddresses?: Input<Input<string>[]>;
  sourceIpGroups?: Input<Input<string>[]>;
}

export interface ApplicationRuleArgs {
  description?: Input<string>;
  //destinationAddresses?: Input<Input<string>[]>;
  fqdnTags?: Input<Input<string>[]>;
  httpHeadersToInsert?: Input<
    Input<inputs.network.FirewallPolicyHttpHeaderToInsertArgs>[]
  >;
  name?: Input<string>;
  protocols?: Input<Input<FirewallPolicyRuleApplicationProtocolArgs>[]>;
  ruleType: Input<'ApplicationRule'>;
  sourceAddresses?: Input<Input<string>[]>;
  sourceIpGroups?: Input<Input<string>[]>;
  targetFqdns?: Input<Input<string>[]>;
  targetUrls?: Input<Input<string>[]>;
  terminateTLS?: Input<boolean>;
  webCategories?: Input<Input<string>[]>;
}

export type FirewallPolicyRuleCollectionResults = NamedType & {
  priority: number;
  ruleCollections: Input<
    Input<
      | inputs.network.FirewallPolicyFilterRuleCollectionArgs
      | inputs.network.FirewallPolicyNatRuleCollectionArgs
    >[]
  >;
};

export type FirewallPolicyResults = NamedType & {
  dnatRules?: Array<Input<NatRuleArgs>>;
  netRules?: Array<Input<NetworkRuleArgs>>;
  appRules?: Array<Input<ApplicationRuleArgs>>;
};

export interface FirewallPolicyProps {
  /**These props for create new policy*/
  parentPolicyId?: Output<string>;
  rules?: FirewallPolicyRuleCollectionResults[];
}

export interface FirewallRuleResults {
  applicationRuleCollections?: inputs.network.AzureFirewallApplicationRuleCollectionArgs[];
  natRuleCollections?: inputs.network.AzureFirewallNatRuleCollectionArgs[];
  networkRuleCollections?: inputs.network.AzureFirewallNetworkRuleCollectionArgs[];
}
