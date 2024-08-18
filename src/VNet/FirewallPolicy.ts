import * as network from '@pulumi/azure-native/network';
import { enums, input as inputs } from '@pulumi/azure-native/types';
import { Input, Resource } from '@pulumi/pulumi';
import { BasicResourceArgs, ResourceGroupInfo } from '../types';
import { naming } from '../Common';
import {
  FirewallPolicyResults,
  FirewallPolicyRuleCollectionResults,
} from './types';

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
    Omit<PolicyRulesProps, 'firewallPolicyName' | 'rules'> {
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

export const FirewallPolicyGroup = ({
  policy,
  priority,
  action = enums.network.FirewallPolicyFilterRuleCollectionActionType.Allow,
}: {
  policy: FirewallPolicyResults;
  priority: number;
  action?: enums.network.FirewallPolicyFilterRuleCollectionActionType;
}): FirewallPolicyRuleCollectionResults => {
  const policyCollections = new Array<
    Input<
      | inputs.network.FirewallPolicyFilterRuleCollectionArgs
      | inputs.network.FirewallPolicyNatRuleCollectionArgs
    >
  >();

  // DNAT rules
  let pStart = priority + 1;
  if (policy.dnatRules && policy.dnatRules.length > 0) {
    policyCollections.push({
      name: `${policy.name}-dnat`,
      priority: pStart++,
      action: {
        type: enums.network.FirewallPolicyNatRuleCollectionActionType.DNAT,
      },
      ruleCollectionType: 'FirewallPolicyNatRuleCollection',
      rules: policy.dnatRules,
    });
  }

  // Network rules
  if (policy.netRules && policy.netRules.length > 0) {
    policyCollections.push({
      name: `${policy.name}-net`,
      priority: pStart++,
      action: {
        type: action,
      },
      ruleCollectionType: 'FirewallPolicyFilterRuleCollection',
      rules: policy.netRules,
    });
  }

  // Apps rules
  if (policy.appRules && policy.appRules.length > 0) {
    policyCollections.push({
      name: `${policy.name}-app`,
      priority: pStart++,
      action: {
        type: action,
      },
      ruleCollectionType: 'FirewallPolicyFilterRuleCollection',
      rules: policy.appRules,
    });
  }

  return {
    name: `${policy.name}-grp`,
    priority,
    ruleCollections: policyCollections,
  };
};

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
  name = naming.getFirewallPolicyName(name);
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
        autoLearnPrivateRanges: 'Enabled',
        privateRanges: ['IANAPrivateRanges'],
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
