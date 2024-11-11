import { input as inputs, enums } from '@pulumi/azure-native/types';

export const deniedOthersRule: inputs.network.AzureFirewallApplicationRuleCollectionArgs =
  {
    name: 'firewall-deny-others-fqdn-rules',
    action: { type: enums.network.AzureFirewallRCActionType.Deny },
    priority: 6001,
    rules: [
      {
        name: 'deny-others-websites',
        description: 'Denied all others websites',
        sourceAddresses: ['*'],
        targetFqdns: ['*'],
        protocols: [
          { protocolType: 'Http', port: 80 },
          { protocolType: 'Https', port: 443 },
          { protocolType: 'Mssql', port: 1433 },
        ],
      },
    ],
  };
