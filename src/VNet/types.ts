import { enums, input as inputs } from "@pulumi/azure-native/types";
import { Input, Output } from "@pulumi/pulumi";

export interface NatRuleArgs {
  description?: Input<string>;
  destinationAddresses?: Input<Input<string>[]>;
  destinationPorts?: Input<Input<string>[]>;
  ipProtocols?: Input<
    Input<string | enums.network.FirewallPolicyRuleNetworkProtocol>[]
  >;
  name?: Input<string>;
  ruleType: Input<"NatRule">;
  sourceAddresses?: Input<Input<string>[]>;
  sourceIpGroups?: Input<Input<string>[]>;
  translatedAddress?: Input<string>;
  translatedFqdn?: Input<string>;
  translatedPort?: Input<string>;
}

export interface NetworkRuleArgs {
  description?: Input<string>;
  destinationAddresses?: Input<Input<string>[]>;
  destinationFqdns?: Input<Input<string>[]>;
  destinationIpGroups?: Input<Input<string>[]>;
  destinationPorts?: Input<Input<string>[]>;
  ipProtocols?: Input<
    Input<string | enums.network.FirewallPolicyRuleNetworkProtocol>[]
  >;
  name?: Input<string>;
  ruleType: Input<"NetworkRule">;
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
  protocols?: Input<
    Input<inputs.network.FirewallPolicyRuleApplicationProtocolArgs>[]
  >;
  ruleType: Input<"ApplicationRule">;
  sourceAddresses?: Input<Input<string>[]>;
  sourceIpGroups?: Input<Input<string>[]>;
  targetFqdns?: Input<Input<string>[]>;
  targetUrls?: Input<Input<string>[]>;
  terminateTLS?: Input<boolean>;
  webCategories?: Input<Input<string>[]>;
}

export type FirewallPolicyRuleCollectionResults = {
  name: string;
  priority: number;
  ruleCollections: Input<
    Input<
      | inputs.network.FirewallPolicyFilterRuleCollectionArgs
      | inputs.network.FirewallPolicyNatRuleCollectionArgs
    >[]
  >;
};

export type FirewallPolicyResults = {
  name: string;
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
