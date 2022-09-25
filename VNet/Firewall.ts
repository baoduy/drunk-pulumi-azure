import * as network from '@pulumi/azure-native/network';
import { input as inputs, enums } from '@pulumi/azure-native/types';
import { Input, Output } from '@pulumi/pulumi';
import ResourceCreator from '../Core/ResourceCreator';
import {
  BasicResourceArgs,
  DefaultResourceArgs,
  BasicMonitorArgs,
} from '../types';
import { defaultTags, isPrd } from '../Common/AzureEnv';
import { getFirewallName } from '../Common/Naming';
import { deniedOthersRule } from './FirewallRules/DefaultRules';
import {
  FirewallPolicyProps,
  FirewallRuleResults,
} from './FirewallRules/types';
import FirewallPolicy, { linkRulesToPolicy } from './FirewallPolicy';

export interface OutboundConfig {
  name?: string;
  subnetId: Input<string>;
  publicIpAddressId: Input<string>;
}

interface Props
  extends BasicResourceArgs,
    Omit<DefaultResourceArgs, 'monitoring'> {
  outbound: Array<OutboundConfig>;

  rules?: FirewallRuleResults;
  policy?: FirewallPolicyProps;

  sku?: {
    name: network.AzureFirewallSkuName;
    tier: network.AzureFirewallSkuTier;
  };

  monitorConfig?: BasicMonitorArgs;
}

export default async ({
  name,
  group,
  rules,
  policy,
  outbound,
  monitorConfig,
  sku = {
    name: network.AzureFirewallSkuName.AZFW_VNet,
    tier: network.AzureFirewallSkuTier.Standard,
  },
  ...others
}: Props) => {
  const fwName = getFirewallName(name);

  if (rules?.applicationRuleCollections) {
    //Add Denied other rules
    rules.applicationRuleCollections.push(deniedOthersRule);
  }

  const fwPolicy = policy?.enabled
    ? FirewallPolicy({
        name,
        group,
        basePolicyId: policy.parentPolicyId,
        sku: sku.tier,
        dnsSettings: { enableProxy: true },
      })
    : undefined;

  const { resource } = await ResourceCreator(network.AzureFirewall, {
    azureFirewallName: fwName,
    ...group,
    ...rules,
    firewallPolicy: fwPolicy ? { id: fwPolicy.id } : undefined,

    zones: isPrd ? ['1', '2', '3'] : undefined,
    threatIntelMode: network.AzureFirewallThreatIntelMode.Deny,
    sku,

    ipConfigurations: outbound.map((o, i) => ({
      name: o.name || `outbound-${i}`,
      publicIPAddress: { id: o.publicIpAddressId },
      subnet: { id: o.subnetId },
    })),

    additionalProperties: rules
      ? {
          'Network.DNS.EnableProxy': 'true',
        }
      : undefined,

    monitoring: {
      ...monitorConfig,
      logsCategories: [
        'AzureFirewallApplicationRule',
        'AzureFirewallNetworkRule',
        'AzureFirewallDnsProxy',
      ],
    },

    tags: defaultTags,
    ...others,
  } as network.AzureFirewallArgs & DefaultResourceArgs);

  //Link Rule to Policy
  if (fwPolicy && policy?.rules) {
    linkRulesToPolicy({
      name: `${name}-policies`,
      group,
      priority: policy.priority,
      firewallPolicyName: fwPolicy.name,
      rules: policy.rules,
      dependsOn: [fwPolicy, resource],
    });
  }

  return { firewall: resource as network.AzureFirewall, policy: fwPolicy };
};
