import * as network from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';
import { Input } from '@pulumi/pulumi';
import { getFirewallName, isPrd, isDryRun } from '../Common';
import ResourceCreator from '../Core/ResourceCreator';
import { OptsArgs, BasicMonitorArgs, BasicResourceArgs } from '../types';
import FirewallPolicy, { linkRulesToPolicy } from './FirewallPolicy';
import { FirewallPolicyProps } from './types';
import IpAddress from './IpAddress';

export interface FwOutboundConfig {
  subnetId: pulumi.Input<string>;
  /** The IDs of public Ip Address.*/
  publicIpAddressId?: pulumi.Input<string>;
}

export type FirewallSkus = {
  name: network.AzureFirewallSkuName;
  tier: network.AzureFirewallSkuTier;
};

export interface FirewallProps extends BasicResourceArgs {
  /** The public outbound IP address can be ignores this property if want to enable the Force Tunneling mode */
  outbound: Array<FwOutboundConfig>;
  /** This must be provided if sku is Basic or want to enable the Force Tunneling mode */
  management?: Pick<FwOutboundConfig, 'subnetId'>;

  snat?: {
    privateRanges?: Input<string>;
    autoLearnPrivateRanges?: boolean;
    routeServerId?: Input<string>;
  };
  //rules?: FirewallRuleResults;
  policy: FirewallPolicyProps;
  enableDnsProxy?: boolean;
  sku?: FirewallSkus;
  monitorConfig?: Omit<BasicMonitorArgs, 'dependsOn'>;
}

export type FirewallResult = {
  firewall: network.AzureFirewall;
  policy: network.FirewallPolicy | undefined;
};

export default ({
  name,
  group,
  snat,
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
}: FirewallProps): FirewallResult => {
  const fwName = getFirewallName(name);

  //Create Public IpAddress for Management
  const manageIpAddress = management
    ? IpAddress({
        name: `${name}-mag`,
        group,
        lock: false,
      })
    : undefined;

  const additionalProperties: Record<string, Input<string>> = {};
  if (enableDnsProxy && sku.tier !== network.AzureFirewallSkuTier.Basic) {
    additionalProperties['Network.DNS.EnableProxy'] = 'Enabled';
  }
  if (snat) {
    if (snat.privateRanges)
      additionalProperties.privateRanges = snat.privateRanges;
    if (snat.autoLearnPrivateRanges)
      additionalProperties.autoLearnPrivateRanges = 'Enabled';
    if (snat.routeServerId)
      additionalProperties['Network.RouteServerInfo.RouteServerID'] =
        snat.routeServerId;
  }

  const fwPolicy = policy
    ? FirewallPolicy({
        name,
        group,
        basePolicyId: policy.parentPolicyId,
        sku: sku.tier,
        dnsSettings:
          sku?.tier !== 'Basic'
            ? {
                enableProxy: true,
              }
            : undefined,
      })
    : undefined;

  const { resource } = ResourceCreator(network.AzureFirewall, {
    azureFirewallName: fwName,
    ...group,
    sku,
    firewallPolicy: fwPolicy ? { id: fwPolicy.id } : undefined,
    zones: isPrd ? ['1', '2', '3'] : undefined,

    threatIntelMode:
      sku.tier !== network.AzureFirewallSkuTier.Basic && sku.name !== 'AZFW_Hub'
        ? network.AzureFirewallThreatIntelMode.Deny
        : undefined,

    managementIpConfiguration:
      management && manageIpAddress
        ? {
            name: 'management',
            publicIPAddress: { id: manageIpAddress.id },
            subnet: { id: management.subnetId },
          }
        : undefined,

    ipConfigurations: outbound
      ? outbound.map((o, i) => ({
          name: `outbound-${i}`,
          publicIPAddress: o.publicIpAddressId
            ? { id: o.publicIpAddressId }
            : undefined,
          subnet: { id: o.subnetId },
        }))
      : undefined,

    additionalProperties,

    monitoring: {
      ...monitorConfig,
      logsCategories: [
        'AzureFirewallApplicationRule',
        'AzureFirewallNetworkRule',
        'AzureFirewallDnsProxy',
      ],
    },

    ...others,
  } as network.AzureFirewallArgs & OptsArgs);

  //Link Rule to Policy
  if (fwPolicy && policy?.rules) {
    linkRulesToPolicy({
      group,
      //priority: 201,
      firewallPolicyName: fwPolicy.name,
      rules: policy.rules,
      dependsOn: [fwPolicy, resource],
    });
  }

  return { firewall: resource as network.AzureFirewall, policy: fwPolicy };
};
