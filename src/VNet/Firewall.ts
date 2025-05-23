import * as network from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';
import { Input, Output } from '@pulumi/pulumi';
import { naming, rsInfo, isPrd } from '../Common';
import {
  BasicResourceArgs,
  LogInfo,
  NamingType,
  ResourceInfo,
  ResourceInfoWithInstance,
} from '../types';
import FirewallPolicy, { linkRulesToPolicy } from './FirewallPolicy';
import { FirewallPolicyProps } from './types';
import * as IpAddress from './IpAddress';
import { createDiagnostic } from '../Monitor';

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
  /** The public outbound IP address can be ignored this property if we want to enable the Force Tunneling mode */
  outbound: Array<FwOutboundConfig>;
  /** This must be provided if sku is Basic or want to enable the Force Tunneling mode */
  management?: Pick<FwOutboundConfig, 'subnetId'>;
  autoScale?: { minCapacity: number; maxCapacity: number };
  snat?: {
    privateRanges?: Input<string>;
    autoLearnPrivateRanges?: boolean;
    routeServerId?: Input<string>;
  };
  //rules?: FirewallRuleResults;
  policy: FirewallPolicyProps;
  enableDnsProxy?: boolean;
  sku?: FirewallSkus;
  /**This is required in order to search firewall logs*/
  logInfo?: LogInfo;
}
export type FirewallResult = ResourceInfoWithInstance<network.AzureFirewall> & {
  policy: network.FirewallPolicy | undefined;
};

/**Create Firewall*/
export const create = ({
  name,
  group,
  snat,
  policy,
  outbound,
  management,
  logInfo,
  enableDnsProxy,
  autoScale,
  sku = {
    name: network.AzureFirewallSkuName.AZFW_VNet,
    tier: network.AzureFirewallSkuTier.Basic,
  },
  dependsOn,
  ignoreChanges,
}: FirewallProps): FirewallResult => {
  name = naming.getFirewallName(name);

  //Create Public IpAddress for Management
  const manageIpAddress = management
    ? IpAddress.create({
        name: `${name}-mag`,
        group,
        lock: false,
        dependsOn,
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
        dependsOn,
      })
    : undefined;

  const firewall = new network.AzureFirewall(
    name,
    {
      azureFirewallName: name,
      ...group,
      sku,
      firewallPolicy: fwPolicy ? { id: fwPolicy.id } : undefined,
      zones: isPrd ? ['1', '2', '3'] : undefined,

      threatIntelMode:
        sku.tier !== network.AzureFirewallSkuTier.Basic &&
        sku.name !== 'AZFW_Hub'
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

      autoscaleConfiguration: autoScale,
    },
    { dependsOn, ignoreChanges }
  );

  if (logInfo) {
    createDiagnostic(name, {
      resourceUri: firewall.id,
      workspaceId: logInfo.logWp.id,
      logs: [
        { categoryGroup: 'AzureFirewallApplicationRule', dayRetention: 7 },
        { categoryGroup: 'AzureFirewallNetworkRule', dayRetention: 7 },
        { categoryGroup: 'AzureFirewallDnsProxy', dayRetention: 7 },
      ],
      dependsOn: firewall,
    });
  }

  //Link Rule to Policy
  if (fwPolicy && policy?.rules) {
    linkRulesToPolicy({
      group,
      //priority: 201,
      firewallPolicyName: fwPolicy.name,
      rules: policy.rules,
      dependsOn: [fwPolicy, firewall],
    });
  }

  return { name, group, id: firewall.id, instance: firewall, policy: fwPolicy };
};

type FirewallIPOutputType = {
  publicIPAddress?: string;
  privateIPAddress: string;
};

export const getFirewallIPAddresses = (
  info: ResourceInfo
): Output<FirewallIPOutputType> => {
  const firewall = network.getAzureFirewallOutput({
    azureFirewallName: info.name,
    ...info.group,
  });

  return firewall.ipConfigurations!.apply(async (cf) => {
    const privateIPAddress = cf![0]!.privateIPAddress!;
    let publicIPAddress: string | undefined = undefined;

    if (cf![0]!.publicIPAddress?.id) {
      const publicInfo = rsInfo.getResourceInfoFromId(
        cf![0]!.publicIPAddress!.id
      )!;
      publicIPAddress = await IpAddress.getPublicIPAddress(publicInfo);
    }

    return { publicIPAddress, privateIPAddress };
  });
};

export const getFirewallInfoWithIPAddresses = (
  groupName: NamingType
): ResourceInfo & {
  ipAddresses: Output<FirewallIPOutputType>;
} => {
  const info = rsInfo.getFirewallInfo(groupName);
  const ipAddresses = getFirewallIPAddresses(info);
  return { ...info, ipAddresses };
};
