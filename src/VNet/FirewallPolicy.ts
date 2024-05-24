import * as network from "@pulumi/azure-native/network";
import { enums, input as inputs } from "@pulumi/azure-native/types";
import { Input, Resource } from "@pulumi/pulumi";
import { BasicResourceArgs, DefaultResourceArgs } from "../types";
import {
  getFirewallPolicyGroupName,
  getFirewallPolicyName,
} from "../Common/Naming";
import { FirewallPolicyResults } from "./FirewallRules/types";

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
  rules: Array<FirewallPolicyResults>;
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

  //Collect the rules
  let p = 200;
  rules.forEach((r, i) => {
    // DNAT rules
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

    // Network rules
    if (r.netRules && r.netRules.length > 0) {
      ruleCollections.push({
        name: `${r.name}-net`,
        priority: i + p++,
        action: {
          type: enums.network.FirewallPolicyFilterRuleCollectionActionType
            .Allow,
        },
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: r.netRules,
      });
    }

    // Application Rules
    if (r.appRules && r.appRules.length > 0) {
      ruleCollections.push({
        name: `${r.name}-app`,
        priority: i + 200 + p++,
        action: {
          type: enums.network.FirewallPolicyFilterRuleCollectionActionType
            .Allow,
        },
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: r.appRules,
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
    { dependsOn },
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
  sku = enums.network.FirewallPolicySkuTier.Basic,
  dependsOn,
}: Props) => {
  name = getFirewallPolicyName(name);
  return new network.FirewallPolicy(
    name,
    {
      firewallPolicyName: name,
      ...group,
      sku: { tier: sku },

      basePolicy: basePolicyId ? { id: basePolicyId } : undefined,
      dnsSettings,
      snat: {
        //Auto learn need a Route Server
        autoLearnPrivateRanges: "Enabled",
        privateRanges: ["IANAPrivateRanges"],
      },
      sql: {
        allowSqlRedirect: true,
      },

      threatIntelMode:
        sku !== enums.network.FirewallPolicySkuTier.Basic
          ? enums.network.AzureFirewallThreatIntelMode.Deny
          : undefined,

      transportSecurity:
        sku !== enums.network.FirewallPolicySkuTier.Basic && transportSecurityCA
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
    },
    { dependsOn },
  );
};
