import { input as inputs, enums } from '@pulumi/azure-native/types';
import * as network from '@pulumi/azure-native/network';
import { Input, Output } from '@pulumi/pulumi';

export interface FirewallRuleProps {
  name: string;
  dnatRules?: Array<Input<inputs.network.NatRuleArgs>>;
  networkRules?: Array<Input<inputs.network.NetworkRuleArgs>>;
  applicationRules?: Array<Input<inputs.network.ApplicationRuleArgs>>;
}

export interface FirewallPolicyProps {
  enabled: boolean;
  /**These props for create new policy*/
  parentPolicyId?: Output<string>;
  priority?: number;
  rules?: Array<FirewallRuleProps>;
}

export interface FirewallRuleResults {
  applicationRuleCollections?: inputs.network.AzureFirewallApplicationRuleCollectionArgs[];
  natRuleCollections?: inputs.network.AzureFirewallNatRuleCollectionArgs[];
  networkRuleCollections?: inputs.network.AzureFirewallNetworkRuleCollectionArgs[];
}

type FirewallRuleCreator = (props: {
  publicIpAddress: network.PublicIPAddress;
}) => FirewallRuleResults;

type FirewallPolicyCreator = (props: {
  publicIpAddress: network.PublicIPAddress;
}) => Omit<FirewallPolicyProps, 'enabled'>;
