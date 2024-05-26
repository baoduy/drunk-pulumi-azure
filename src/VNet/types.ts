import { enums, input as inputs } from "@pulumi/azure-native/types";
import * as pulumi from "@pulumi/pulumi";
import { Input, Output } from "@pulumi/pulumi";

export interface NetworkRuleArgs {
  description?: pulumi.Input<string>;
  destinationAddresses?: pulumi.Input<pulumi.Input<string>[]>;
  destinationFqdns?: pulumi.Input<pulumi.Input<string>[]>;
  destinationIpGroups?: pulumi.Input<pulumi.Input<string>[]>;
  destinationPorts?: pulumi.Input<pulumi.Input<string>[]>;
  ipProtocols?: pulumi.Input<
    pulumi.Input<string | enums.network.FirewallPolicyRuleNetworkProtocol>[]
  >;
  name?: pulumi.Input<string>;
  ruleType: pulumi.Input<"NetworkRule">;
  sourceAddresses?: pulumi.Input<pulumi.Input<string>[]>;
  sourceIpGroups?: pulumi.Input<pulumi.Input<string>[]>;
}

export interface ApplicationRuleArgs {
  description?: pulumi.Input<string>;
  //destinationAddresses?: pulumi.Input<pulumi.Input<string>[]>;
  fqdnTags?: pulumi.Input<pulumi.Input<string>[]>;
  httpHeadersToInsert?: pulumi.Input<
    pulumi.Input<inputs.network.FirewallPolicyHttpHeaderToInsertArgs>[]
  >;
  name?: pulumi.Input<string>;
  protocols?: pulumi.Input<
    pulumi.Input<inputs.network.FirewallPolicyRuleApplicationProtocolArgs>[]
  >;
  ruleType: pulumi.Input<"ApplicationRule">;
  sourceAddresses?: pulumi.Input<pulumi.Input<string>[]>;
  sourceIpGroups?: pulumi.Input<pulumi.Input<string>[]>;
  targetFqdns?: pulumi.Input<pulumi.Input<string>[]>;
  targetUrls?: pulumi.Input<pulumi.Input<string>[]>;
  terminateTLS?: pulumi.Input<boolean>;
  webCategories?: pulumi.Input<pulumi.Input<string>[]>;
}

export type FirewallPolicyRuleCollectionResults = {
  name: string;
  priority: number;
  ruleCollections: pulumi.Input<
    pulumi.Input<
      | inputs.network.FirewallPolicyFilterRuleCollectionArgs
      | inputs.network.FirewallPolicyNatRuleCollectionArgs
    >[]
  >;
};

export type FirewallPolicyResults = {
  name: string;
  dnatRules?: Array<Input<inputs.network.NatRuleArgs>>;
  netRules?: Array<Input<inputs.network.NetworkRuleArgs>>;
  appRules?: Array<Input<inputs.network.ApplicationRuleArgs>>;
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
