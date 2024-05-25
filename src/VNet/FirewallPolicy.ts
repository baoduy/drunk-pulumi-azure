import * as network from "@pulumi/azure-native/network";
import { enums, input as inputs } from "@pulumi/azure-native/types";
import { Input, Resource } from "@pulumi/pulumi";
import {
  BasicResourceArgs,
  DefaultResourceArgs,
  ResourceGroupInfo,
} from "../types";
import { getFirewallPolicyName } from "../Common/Naming";
import { FirewallPolicyRuleCollectionResults } from "./types";

interface PolicyRulesProps {
  group: ResourceGroupInfo;
  firewallPolicyName: Input<string>;
  rules: FirewallPolicyRuleCollectionResults[];
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export const linkRulesToPolicy = ({
  firewallPolicyName,
  group,
  rules,
  dependsOn,
}: PolicyRulesProps) =>
  rules
    .sort((a, b) => a.priority - b.priority)
    .map((p) => {
      const gr = new network.FirewallPolicyRuleCollectionGroup(
        p.name,
        {
          ...group,
          ...p,
          firewallPolicyName,
        },
        { dependsOn },
      );
      dependsOn = gr;
      return gr;
    });

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
