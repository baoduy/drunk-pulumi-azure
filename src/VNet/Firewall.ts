import * as network from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';

import { isPrd } from '../Common/AzureEnv';
import { getFirewallName } from '../Common/Naming';
import ResourceCreator from '../Core/ResourceCreator';
import {
  BasicMonitorArgs,
  BasicResourceArgs,
  DefaultResourceArgs,
} from '../types';
import FirewallPolicy, { linkRulesToPolicy } from './FirewallPolicy';
import { FirewallPolicyProps } from './FirewallRules/types';

export interface FwOutboundConfig {
  name?: string;
  subnetId: pulumi.Input<string>;
  publicIpAddress: network.PublicIPAddress;
}

export type FirewallSkus = {
  name: network.AzureFirewallSkuName;
  tier: network.AzureFirewallSkuTier;
};

interface Props
  extends BasicResourceArgs,
    Omit<DefaultResourceArgs, 'monitoring'> {
  outbound: Array<FwOutboundConfig>;
  /** This must be provided if sku is Basic */
  management?: FwOutboundConfig;
  //rules?: FirewallRuleResults;
  policy: FirewallPolicyProps;
  enableDnsProxy?: boolean;
  sku?: FirewallSkus;

  monitorConfig?: BasicMonitorArgs;
}

export default ({
  name,
  group,
  //rules,
  policy,
  outbound,
  management,
  monitorConfig,
  enableDnsProxy,
  sku = {
    name: network.AzureFirewallSkuName.AZFW_VNet,
    tier: network.AzureFirewallSkuTier.Basic,
  },
  ...others
}: Props) => {
  if (sku.tier === network.AzureFirewallSkuTier.Basic && !management) {
    throw new Error(
      'Management Public Ip Address is required for Firewall Basic tier.'
    );
  }

  const fwName = getFirewallName(name);

  // if (rules?.applicationRuleCollections) {
  //   //Add Denied other rules
  //   rules.applicationRuleCollections.push(deniedOthersRule);
  // }

  const fwPolicy = policy.enabled
    ? FirewallPolicy({
        name,
        group,
        basePolicyId: policy.parentPolicyId,
        sku: sku.tier,
        dnsSettings: { enableProxy: true },
      })
    : undefined;

  const dependsOn = new Array<pulumi.Resource>();
  outbound.forEach((o) => dependsOn.push(o.publicIpAddress));
  if (management) dependsOn.push(management.publicIpAddress);

  const { resource } = ResourceCreator(network.AzureFirewall, {
    azureFirewallName: fwName,
    ...group,
    //...rules,
    firewallPolicy: fwPolicy ? { id: fwPolicy.id } : undefined,

    zones: isPrd ? ['1', '2', '3'] : undefined,
    threatIntelMode: network.AzureFirewallThreatIntelMode.Deny,
    sku,

    managementIpConfiguration: management
      ? {
          name: management.name,
          publicIPAddress: { id: management.publicIpAddress.id },
          subnet: { id: management.subnetId },
        }
      : undefined,

    ipConfigurations: outbound.map((o, i) => ({
      name: o.name || `outbound-${i}`,
      publicIPAddress: o.publicIpAddress.id
        ? { id: o.publicIpAddress.id }
        : undefined,
      subnet: { id: o.subnetId },
    })),

    additionalProperties:
      enableDnsProxy && sku.tier !== network.AzureFirewallSkuTier.Basic
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

    ...others,
    dependsOn,
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
