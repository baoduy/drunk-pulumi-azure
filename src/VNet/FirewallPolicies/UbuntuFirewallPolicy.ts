import { Input } from '@pulumi/pulumi';
import { input as inputs } from '@pulumi/azure-native/types';
import { allAzurePorts, currentRegionCode } from '../../Common';
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from '../types';
import { FirewallPolicyGroup } from '../FirewallPolicy';

interface UbuntuFirewallPolicyProps {
  name: string;
  priority: number;
  subnetSpaces: Array<Input<string>>;
}

export default ({
  name,
  priority,
  subnetSpaces,
}: UbuntuFirewallPolicyProps): FirewallPolicyRuleCollectionResults => {
  const netRules = new Array<Input<NetworkRuleArgs>>();
  const appRules = new Array<Input<ApplicationRuleArgs>>();

  netRules.push(
    {
      ruleType: 'NetworkRule',
      name: `${name}-time`,
      description:
        'Required for Network Time Protocol (NTP) time synchronization on Linux nodes.',
      ipProtocols: ['UDP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: ['ntp.ubuntu.com'],
      destinationPorts: ['123'],
    },
    {
      ruleType: 'NetworkRule',
      name: `${name}-allows-commons-dns`,
      description: 'Others DNS.',
      ipProtocols: ['TCP', 'UDP'],
      sourceAddresses: ['*'],
      destinationAddresses: [
        //Azure
        '168.63.129.16',
        //CloudFlare
        '1.1.1.1',
        '1.0.0.1',
        //Google
        '8.8.8.8',
        '8.8.4.4',
      ],
      destinationPorts: ['53'],
    },
  );

  //AKS Apps Rules
  appRules.push(
    {
      ruleType: 'ApplicationRule',
      name: `${name}-azure-monitors`,
      description: 'Azure AKS Monitoring',
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        'dc.services.visualstudio.com',
        '*.ods.opinsights.azure.com',
        '*.oms.opinsights.azure.com',
        '*.monitoring.azure.com',
        '*.services.visualstudio.com',
      ],
      protocols: [{ protocolType: 'Https', port: 443 }],
    },
    {
      ruleType: 'ApplicationRule',
      name: `${name}-azure-policy`,
      description: 'Azure AKS Policy Management',
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        '*.policy.core.windows.net',
        'gov-prod-policy-data.trafficmanager.net',
        'raw.githubusercontent.com',
        'dc.services.visualstudio.com',
      ],
      protocols: [{ protocolType: 'Https', port: 443 }],
    },
    {
      ruleType: 'ApplicationRule',
      name: `${name}-ubuntu`,
      description: 'Allows Ubuntu Services',
      sourceAddresses: subnetSpaces,
      targetFqdns: ['*.ubuntu.com'],
      protocols: [
        { protocolType: 'Https', port: 443 },
        { protocolType: 'Http', port: 80 },
      ],
    },
  );

  return FirewallPolicyGroup({
    policy: { name, netRules, appRules },
    priority,
    action: 'Allow',
  });
};
