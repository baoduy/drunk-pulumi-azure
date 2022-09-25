import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';
import { stack } from '../../Common/StackEnv';
import VNetPeering, { VNetPeeringProps } from '../NetworkPeering';
import * as azure from '@pulumi/azure';

interface Props {
  name: string;
  vnetPeering?: VNetPeeringProps;
  routeTable?: {
    name: Input<string>;
    resourceGroupName: Input<string>;
  };
  firewall?: {
    name: Input<string>;
    priority?: number;
    resourceGroupName: Input<string>;
    sourceAddressPrefixes?: Input<string[]>;
    firewallPrivateIpAddress: Input<string>;
  };
}

export default ({ name, vnetPeering, routeTable, firewall }: Props) => {
  if (vnetPeering) {
    VNetPeering(vnetPeering);
  }

  if (routeTable && firewall?.firewallPrivateIpAddress) {
    new network.Route(`${stack}-${name}-to-Firewall`, {
      routeName: 'Route-to-Firewall',
      routeTableName: routeTable.name,
      resourceGroupName: routeTable.resourceGroupName,
      addressPrefix: '0.0.0.0/0',
      nextHopType: 'VirtualAppliance',
      nextHopIpAddress: firewall.firewallPrivateIpAddress,
    });
  }
  if (firewall) {
    if (!firewall.priority) firewall.priority = 1000;

    new azure.network.FirewallNetworkRuleCollection(`${name}-net-rules`, {
      name: `${name}-net-rules`,
      azureFirewallName: firewall.name,
      resourceGroupName: firewall.resourceGroupName,
      action: 'Allow',
      priority: firewall.priority++,
      rules: [
        {
          name: 'allow-AVD-traffic',
          description: 'AVD traffic',
          protocols: ['TCP'],
          sourceAddresses: firewall.sourceAddressPrefixes,
          destinationAddresses: ['169.254.169.254', '168.63.129.16'],
          destinationPorts: ['80'],
        },
        {
          name: 'allow-AVD-WA',
          description: 'AVD WA',
          protocols: ['TCP'],
          sourceAddresses: firewall.sourceAddressPrefixes,
          destinationAddresses: ['23.102.135.246'],
          destinationPorts: ['1688'],
        },
        {
          name: 'allow-time-sync',
          description: 'Win time sync',
          protocols: ['UDP'],
          sourceAddresses: firewall.sourceAddressPrefixes,
          destinationFqdns: ['time.windows.com'],
          destinationPorts: ['123'],
        },
      ],
    });

    new azure.network.FirewallApplicationRuleCollection('cloudPC-app-rules', {
      name: 'cloudPC-app-rules',
      azureFirewallName: firewall.name,
      resourceGroupName: firewall.resourceGroupName,
      action: 'Allow',
      priority: firewall.priority++,
      rules: [
        {
          name: 'allow-AVD-vvd',
          description: 'WindowsVirtualDesktop traffic',
          sourceAddresses: firewall.sourceAddressPrefixes,
          //protocols: [{ type: 'Https', port: 443 }],
          fqdnTags: ['WindowsVirtualDesktop'],
        },
        {
          name: 'allow-AVD-Diagnostics',
          description: 'WindowsVirtualDesktop Diagnostics',
          sourceAddresses: firewall.sourceAddressPrefixes,
          //protocols: [{ type: 'Https', port: 443 }],
          fqdnTags: ['WindowsDiagnostics'],
        },
        {
          name: 'allow-AVD-Update',
          description: 'WindowsVirtualDesktop Update',
          sourceAddresses: firewall.sourceAddressPrefixes,
          //protocols: [{ type: 'Https', port: 443 }],
          fqdnTags: ['WindowsUpdate'],
        },
        {
          name: 'allow-AVD-https',
          description: 'Azure Virtual Desktop traffic',
          protocols: [{ type: 'Https', port: 443 }],
          sourceAddresses: firewall.sourceAddressPrefixes,
          targetFqdns: [
            // '*.wvd.microsoft.com',
            // 'gcs.prod.monitoring.core.windows.net',
            // 'production.diagnostics.monitoring.core.windows.net',
            '*xt.blob.core.windows.net',
            '*eh.servicebus.windows.net',
            '*xt.table.core.windows.net',
            '*xt.queue.core.windows.net',
          ],
        },
      ],
    });
  }
};
