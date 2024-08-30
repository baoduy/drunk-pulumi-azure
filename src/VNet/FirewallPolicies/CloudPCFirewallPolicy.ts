import { Input } from '@pulumi/pulumi';
import { allAzurePorts, currentRegionCode } from '../../Common';
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from '../types';
import { FirewallPolicyGroup } from '../FirewallPolicy';

interface Props {
  name?: string;
  priority: number;
  subnetSpaces: Array<Input<string>>;
  allowAllOutbound?: boolean;
  allowIpCheckApi?: boolean;
  allowsAzure?: boolean;
  allowsAzDevOps?: boolean;
  allowsK8sTools?: boolean;
  allowsDevTools?: boolean;
  allowsSearch?: boolean;
  allowsOffice365?: boolean;
  allowsWindows365?: boolean;
}

//https://www.robtex.com/dns-lookup/global.azure-devices-provisioning.net

export default ({
  name = 'cloud-pc',
  priority,
  subnetSpaces,
  allowsOffice365,
  allowsWindows365,
  allowsAzure,
  allowsAzDevOps,
  allowsK8sTools,
  allowsDevTools,
  allowIpCheckApi,
  allowsSearch,
  allowAllOutbound,
}: Props): FirewallPolicyRuleCollectionResults => {
  const netRules = new Array<Input<NetworkRuleArgs>>();
  const appRules = new Array<Input<ApplicationRuleArgs>>();

  if (allowAllOutbound) {
    netRules.push({
      ruleType: 'NetworkRule',
      name: `${name}-net-allow-all-outbound`,
      description: 'CloudPc allows all outbound',
      ipProtocols: ['TCP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: ['*'],
      destinationPorts: ['443', '80'],
    });
  }

  //Default PC Rules
  appRules.push({
    ruleType: 'ApplicationRule',
    name: `${name}-app-allow-fqdnTags`,
    description: 'Allows Windows Updates',
    sourceAddresses: subnetSpaces,
    fqdnTags: ['WindowsUpdate', 'WindowsDiagnostics'],
    protocols: [{ protocolType: 'Https', port: 443 }],
  });

  if (allowsAzure) {
    netRules.push({
      ruleType: 'NetworkRule',
      name: `${name}-net-allows-azure`,
      description: 'Allows Cloud PC to access to Azure.',
      ipProtocols: ['TCP', 'UDP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [`AzureCloud.${currentRegionCode}`],
      destinationPorts: allAzurePorts,
    });

    netRules.push({
      ruleType: 'NetworkRule',
      name: `${name}-net-allows-azure-all`,
      description: 'Allows Cloud PC to access to Azure.',
      ipProtocols: ['TCP', 'UDP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [`AzureCloud`],
      destinationPorts: allAzurePorts,
    });

    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-azure-fqdnTags`,
      description: 'Allows Windows Updates',
      sourceAddresses: subnetSpaces,
      fqdnTags: [
        'AzureBackup',
        'AzureKubernetesService',
        'AzureActiveDirectoryDomainServices',
      ],
      protocols: [{ protocolType: 'Https', port: 443 }],
    });

    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-access-azure-portal`,
      description: 'Allows Ip Azure Portal',
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        '*.azure.com',
        '*.azure.net',
        '*.microsoftonline.com',
        '*.msauth.net',
        '*.msauthimages.net',
        '*.msecnd.net',
        '*.msftauth.net',
        '*.msftauthimages.net',
        'www.microsoft.com',
        'learn.microsoft.com',
      ],
      protocols: [{ protocolType: 'Https', port: 443 }],
    });
  }

  if (allowsAzDevOps) {
    netRules.push({
      ruleType: 'NetworkRule',
      name: `${name}-net-allow-AzureDevOps`,
      description: 'AzureDevOps',
      ipProtocols: ['TCP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [
        '13.107.6.0/24',
        '13.107.9.0/24',
        '13.107.42.0/24',
        '13.107.43.0/24',
      ],
      destinationPorts: ['443'],
    });
    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-azure-resources`,
      description: 'Allows Azure Resources',
      protocols: [{ protocolType: 'Https', port: 443 }],
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        //Azure DevOps
        'vscode.dev',
        '*.vscode.dev',
        '*.dev.azure.com',
        '*.vsassets.io',
        '*gallerycdn.vsassets.io',
        '*vstmrblob.vsassets.io',
        'aadcdn.msauth.net',
        'aadcdn.msftauth.net',
        'aex.dev.azure.com',
        'aexprodea1.vsaex.visualstudio.com',
        'amcdn.msftauth.net',
        'amp.azure.net',
        'app.vssps.dev.azure.com',
        'app.vssps.visualstudio.com',
        '*.vssps.visualstudio.com',
        'azure.microsoft.com',
        'azurecomcdn.azureedge.net',
        'cdn.vsassets.io',
        'dev.azure.com',
        'go.microsoft.com',
        'graph.microsoft.com',
        'live.com',
        'login.live.com',
        'login.microsoftonline.com',
        'management.azure.com',
        'management.core.windows.net',
        'microsoft.com',
        'microsoftonline.com',
        'static2.sharepointonline.com',
        'visualstudio.com',
        'vsrm.dev.azure.com',
        'vstsagentpackage.azureedge.net',
        'windows.net',
        'login.microsoftonline.com',
        'app.vssps.visualstudio.com',
        '*.blob.core.windows.net',
      ],
    });
  }

  if (allowsK8sTools) {
    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-k8s-lens`,
      description: 'Allows K8s Lens',
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        '*.k8slens.dev',
        'github.com',
        '*.githubassets.com',
        '*.githubusercontent.com',
        '*.googleapis.com',
        'aka.ms',
        '*.chocolatey.org',
      ],
      protocols: [{ protocolType: 'Https', port: 443 }],
    });
  }

  if (allowsDevTools) {
    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-dev-tools`,
      description: 'Allows Dev Tools',
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        'github.com',
        '*.github.com',
        '*.pulumi.com',
        '*.npmjs.com',
        '*.nuget.org',
      ],
      protocols: [{ protocolType: 'Https', port: 443 }],
    });
  }

  if (allowsOffice365) {
    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-office365`,
      description: 'Allows Office365',
      sourceAddresses: subnetSpaces,
      fqdnTags: ['Office365', 'Office365.SharePoint'],
      protocols: [{ protocolType: 'Https', port: 443 }],
    });
  }
  if (allowsWindows365) {
    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-win365`,
      description: 'Allows Windows365',
      sourceAddresses: subnetSpaces,
      fqdnTags: ['Windows365', 'MicrosoftIntune'],
      protocols: [{ protocolType: 'Https', port: 443 }],
    });

    netRules.push(
      {
        ruleType: 'NetworkRule',
        name: `${name}-net-allow-win365-windows-net`,
        description: 'CloudPc allows Windows 365 windows.net',
        ipProtocols: ['TCP'],
        sourceAddresses: subnetSpaces,
        //destinationFqdns: ["azkms.core.windows.net"],
        destinationAddresses: [
          '40.83.235.53',
          //"2a01:111:f100:3000::a83e:1b30"
        ],
        destinationPorts: ['1688'],
      },
      {
        ruleType: 'NetworkRule',
        name: `${name}-net-allow-win365-azure-devices`,
        description: 'CloudPc allows Windows 365 azure-devices',
        ipProtocols: ['TCP'],
        sourceAddresses: subnetSpaces,
        // destinationFqdns: [
        //   "global.azure-devices-provisioning.net",
        //   "hm-iot-in-prod-preu01.azure-devices.net",
        //   "hm-iot-in-prod-prap01.azure-devices.net",
        //   "hm-iot-in-prod-prna01.azure-devices.net",
        //   "hm-iot-in-prod-prau01.azure-devices.net",
        //   "hm-iot-in-prod-prna02.azure-devices.net",
        //   "hm-iot-in-2-prod-prna01.azure-devices.net",
        //   "hm-iot-in-3-prod-prna01.azure-devices.net",
        //   "hm-iot-in-2-prod-preu01.azure-devices.net",
        //   "hm-iot-in-3-prod-preu01.azure-devices.net",
        //   "hm-iot-in-4-prod-prna01.azure-devices.net",
        // ],
        destinationAddresses: [
          '23.98.104.204',
          '40.78.238.4',
          '20.150.179.224',
          '52.236.189.131',
          '13.69.71.14',
          '13.69.71.2',
          '13.70.74.193',
          '13.86.221.39',
          '13.86.221.36',
          '13.86.221.43',
        ],
        destinationPorts: ['443', '5671'],
      },
      {
        ruleType: 'NetworkRule',
        name: `${name}-net-allow-win365-udp-tcp`,
        description: 'CloudPc allows Windows 365 udp tcp',
        ipProtocols: ['UDP', 'TCP'],
        sourceAddresses: subnetSpaces,
        destinationAddresses: ['20.202.0.0/16'],
        destinationPorts: ['443', '3478'],
      },
    );
  }

  if (allowsSearch) {
    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-search-engines`,
      description: 'Allows Search Engines',
      sourceAddresses: subnetSpaces,
      targetFqdns: ['google.com', 'www.google.com', 'bing.com', 'www.bing.com'],
      protocols: [{ protocolType: 'Https', port: 443 }],
    });
  }

  if (allowIpCheckApi) {
    appRules.push({
      ruleType: 'ApplicationRule',
      name: `${name}-app-allow-ip-checks`,
      description: 'Allows Ip Checks',
      sourceAddresses: subnetSpaces,
      targetFqdns: ['api.ipify.org'],
      protocols: [{ protocolType: 'Https', port: 443 }],
    });
  }

  return FirewallPolicyGroup({
    policy: { name: `${name}-firewall-policy`, netRules, appRules },
    priority,
    action: 'Allow',
  });
};
