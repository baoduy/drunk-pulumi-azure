import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';
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

export interface FwOutboundConfig {
  name?: string;
  subnetId: Input<string>;
  publicIpAddressId?: Input<string>;
}

interface Props
  extends BasicResourceArgs,
    Omit<DefaultResourceArgs, 'monitoring'> {
  outbound: Array<FwOutboundConfig>;
  /** This must be provided if sku is Basic */
  management?: FwOutboundConfig;

  rules?: FirewallRuleResults;
  policy?: FirewallPolicyProps;

  sku?: {
    name: network.v20220501.AzureFirewallSkuName;
    tier: network.v20220501.AzureFirewallSkuTier;
  };

  monitorConfig?: BasicMonitorArgs;
}

export default async ({
  name,
  group,
  rules,
  policy,
  outbound,
  management,
  monitorConfig,
  sku = {
    name: network.AzureFirewallSkuName.AZFW_VNet,
    tier: network.v20220501.AzureFirewallSkuTier.Basic,
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

  const { resource } = await ResourceCreator(network.v20220501.AzureFirewall, {
    azureFirewallName: fwName,
    ...group,
    ...rules,
    firewallPolicy: fwPolicy ? { id: fwPolicy.id } : undefined,

    zones: isPrd ? ['1', '2', '3'] : undefined,
    threatIntelMode: network.AzureFirewallThreatIntelMode.Deny,
    sku,

    managementIpConfiguration: management
      ? {
          name: management.name,
          publicIPAddress: { id: management.publicIpAddressId },
          subnet: { id: management.subnetId },
        }
      : undefined,

    ipConfigurations: outbound.map((o, i) => ({
      name: o.name || `outbound-${i}`,
      publicIPAddress: o.publicIpAddressId
        ? { id: o.publicIpAddressId }
        : undefined,
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
  } as network.v20220501.AzureFirewallArgs & DefaultResourceArgs);

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
