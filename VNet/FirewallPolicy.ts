import * as network from "@pulumi/azure-native/network";
import { input as inputs, enums } from "@pulumi/azure-native/types";
import { Input, Resource } from "@pulumi/pulumi";
import ResourceCreator from "../Core/ResourceCreator";
import {
  BasicResourceArgs,
  DefaultResourceArgs,
  BasicMonitorArgs,
} from "../types";
import { defaultTags, isPrd } from "../Common/AzureEnv";
import {
  getFirewallName,
  getFirewallPolicyGroupName,
  getFirewallPolicyName,
} from "../Common/Naming";
import { deniedOthersRule } from "./FirewallRules/DefaultRules";
import { FirewallRuleProps } from "./FirewallRules/types";

export const denyOtherAppRule: inputs.network.ApplicationRuleArgs = {
  name: "deny-others-websites",
  ruleType: "ApplicationRule",
  description: "Deny All Others websites",
  sourceAddresses: ["*"],
  targetFqdns: ["*"],
  protocols: [
    { protocolType: "Http", port: 80 },
    { protocolType: "Https", port: 443 },
    { protocolType: "Mssql", port: 1433 },
  ],
};

interface PolicyRulesProps extends BasicResourceArgs {
  firewallPolicyName: Input<string>;
  priority?: number;
  rules: Array<FirewallRuleProps>;
  enableDenyOtherAppRule?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export const linkRulesToPolicy = ({
  firewallPolicyName,
  priority = 200,
  group,
  name,
  rules,
  enableDenyOtherAppRule,
  dependsOn,
}: PolicyRulesProps) => {
  const ruleCollections = new Array<
    Input<
      | inputs.network.FirewallPolicyFilterRuleCollectionArgs
      | inputs.network.FirewallPolicyNatRuleCollectionArgs
    >
  >();

  let p = 200;
  rules.forEach((r, i) => {
    if (r.dnatRules && r.dnatRules.length > 0) {
      ruleCollections.push({
        name: `${r.name}-dnat`,
        priority: i + p++,
        action: {
          type: enums.network.FirewallPolicyNatRuleCollectionActionType.DNAT,
        },
        ruleCollectionType: "FirewallPolicyNatRuleCollection",
        rules: r.dnatRules,
      });
    }

    if (r.networkRules && r.networkRules.length > 0) {
      ruleCollections.push({
        name: `${r.name}-net`,
        priority: i + p++,
        action: {
          type: enums.network.FirewallPolicyFilterRuleCollectionActionType
            .Allow,
        },
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: r.networkRules,
      });
    }

    if (r.applicationRules && r.applicationRules.length > 0) {
      ruleCollections.push({
        name: `${r.name}-app`,
        priority: i + 200 + p++,
        action: {
          type: enums.network.FirewallPolicyFilterRuleCollectionActionType
            .Allow,
        },
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: r.applicationRules,
      });
    }
  });

  if (enableDenyOtherAppRule) {
    //Denied others
    ruleCollections.push({
      name: `${name}-deny-others`,
      priority: 6001,
      action: {
        type: enums.network.FirewallPolicyFilterRuleCollectionActionType.Allow,
      },
      ruleCollectionType: "FirewallPolicyFilterRuleCollection",
      rules: [denyOtherAppRule],
    });
  }

  const groupName = getFirewallPolicyGroupName(name);
  return new network.FirewallPolicyRuleCollectionGroup(
    groupName,
    {
      name: groupName,
      ...group,
      firewallPolicyName,
      priority,
      ruleCollections,
    },
    { dependsOn }
  );
};

interface Props
  extends BasicResourceArgs,
    Omit<DefaultResourceArgs, "monitoring">,
    Omit<PolicyRulesProps, "firewallPolicyName" | "rules"> {
  basePolicyId?: Input<string>;

  dnsSettings?: Input<inputs.network.DnsSettingsArgs>;
  transportSecurityCA?: inputs.network.FirewallPolicyCertificateAuthorityArgs;

  sku?: enums.network.FirewallPolicySkuTier;
  insights?: {
    defaultWorkspaceId?: Input<string>;
    workspaces: Array<{
      regions: Input<string>;
      workspaceId?: Input<string>;
    }>;
  };
}

export default ({
  name,
  group,

  basePolicyId,
  dnsSettings,

  transportSecurityCA,
  insights,
  sku = enums.network.FirewallPolicySkuTier.Standard,
  dependsOn,
}: Props) => {
  name = getFirewallPolicyName(name);

  const policy = new network.FirewallPolicy(
    name,
    {
      firewallPolicyName: name,
      ...group,
      sku: { tier: sku },

      basePolicy: basePolicyId ? { id: basePolicyId } : undefined,
      dnsSettings,

      threatIntelMode: enums.network.AzureFirewallThreatIntelMode.Deny,
      transportSecurity: transportSecurityCA
        ? { certificateAuthority: transportSecurityCA }
        : undefined,

      insights: insights
        ? {
            isEnabled: true,
            logAnalyticsResources: {
              defaultWorkspaceId: { id: insights.defaultWorkspaceId },
              workspaces: insights.workspaces.map((i) => ({
                region: i.regions,
                workspaceId: { id: i.workspaceId },
              })),
            },
          }
        : undefined,
      tags: defaultTags,
    },
    { dependsOn }
  );

  return policy;
};
