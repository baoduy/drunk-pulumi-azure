import { input as inputs, enums } from "@pulumi/azure-native/types";
import { Input, Output } from "@pulumi/pulumi";
import { FirewallPolicyRuleCollectionResults } from "../types";

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
