import * as network from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';
import { Input, Output } from '@pulumi/pulumi';
import { getFirewallName, rsInfo, isPrd } from '../Common';
import {
  BasicResourceArgs,
  ConventionProps,
  LogInfo,
  ResourceInfo,
  ResourceInfoWithInstance,
} from '../types';
import FirewallPolicy, { linkRulesToPolicy } from './FirewallPolicy';
import { FirewallPolicyProps } from './types';
import * as IpAddress from './IpAddress';
import { createDiagnostic } from '../Logs/Helpers';

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
  sku = {
    name: network.AzureFirewallSkuName.AZFW_VNet,
    tier: network.AzureFirewallSkuTier.Basic,
  },
  dependsOn,
  ignoreChanges,
}: FirewallProps): FirewallResult => {
  name = getFirewallName(name);

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
    },
    { dependsOn, ignoreChanges },
  );

  if (logInfo) {
    createDiagnostic({
      name,
      targetResourceId: firewall.id,
      logInfo,
      logsCategories: [
        'AzureFirewallApplicationRule',
        'AzureFirewallNetworkRule',
        'AzureFirewallDnsProxy',
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
  info: ResourceInfo,
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
        cf![0]!.publicIPAddress!.id,
      )!;
      publicIPAddress = await IpAddress.getPublicIPAddress(publicInfo);
    }

    return { publicIPAddress, privateIPAddress };
  });
};

export const getFirewallInfoWithIPAddresses = (
  groupName: string,
  ops: ConventionProps | undefined = undefined,
): ResourceInfo & {
  ipAddresses: Output<FirewallIPOutputType>;
} => {
  const info = rsInfo.getFirewallInfo(groupName, ops);
  const ipAddresses = getFirewallIPAddresses(info);
  return { ...info, ipAddresses };
};
