import { Input } from '@pulumi/pulumi';
import { input as inputs } from '@pulumi/azure-native/types';
import { allAzurePorts, currentRegionCode } from '../../Common';
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from '../types';
import { FirewallPolicyGroup } from '../FirewallPolicy';

interface AzureFirewallPolicyProps {
  priority: number;

  subnetSpaces: Array<Input<string>>;
  /** Allows access to Docker and Kubernetes registries */
  allowAccessPublicRegistries?: boolean;
  trustedAcrs?: string[];

  dNATs?: [
    {
      name: string;
      allowHttp?: boolean;
      publicIpAddresses: Input<string>[];
      /** Default value is '*' and it will allows all incoming requests */
      sourceIpAddress?: Input<string>;
      internalIpAddress: Input<string>;
    },
  ];
}

export default ({
  priority,
  allowAccessPublicRegistries,
  subnetSpaces,
  trustedAcrs = [],
  dNATs,
}: AzureFirewallPolicyProps): FirewallPolicyRuleCollectionResults => {
  const dnatRules = new Array<Input<inputs.network.NatRuleArgs>>();
  const netRules = new Array<Input<NetworkRuleArgs>>();
  const appRules = new Array<Input<ApplicationRuleArgs>>();

  if (dNATs) {
    dNATs.forEach((nat) => {
      dnatRules.push({
        ruleType: 'NatRule',
        name: `${nat.name}-inbound-443`,
        description: `Forward port 443 external IpAddress of ${nat.name} to internal IpAddress`,
        sourceAddresses: [nat.sourceIpAddress ?? '*'],
        destinationAddresses: nat.publicIpAddresses,
        destinationPorts: ['443'],
        ipProtocols: ['TCP'],
        translatedAddress: nat.internalIpAddress,
        translatedPort: '443',
      });

      if (nat.allowHttp)
        dnatRules.push({
          ruleType: 'NatRule',
          name: `${nat.name}-inbound-80`,
          description: `Forward port 80 external IpAddress of ${nat.name} to internal IpAddress`,
          sourceAddresses: [nat.sourceIpAddress ?? '*'],
          destinationAddresses: nat.publicIpAddresses,
          destinationPorts: ['80'],
          ipProtocols: ['TCP'],
          translatedAddress: nat.internalIpAddress,
          translatedPort: '80',
        });
    });
  }

  //AKS Network Rules
  netRules.push(
    {
      ruleType: 'NetworkRule',
      name: 'aks-vpn',
      description:
        'For OPEN VPN tunneled secure communication between the nodes and the control plane for AzureCloud',
      ipProtocols: ['UDP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [`AzureCloud.${currentRegionCode}`],
      destinationPorts: ['1194'],
    },
    {
      ruleType: 'NetworkRule',
      name: 'aks-tcp',
      description:
        'For tunneled secure communication between the nodes and the control plane for AzureCloud',
      ipProtocols: ['TCP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [`AzureCloud.${currentRegionCode}`],
      destinationPorts: allAzurePorts,
    },
    {
      ruleType: 'NetworkRule',
      name: 'aks-time',
      description:
        'Required for Network Time Protocol (NTP) time synchronization on Linux nodes.',
      ipProtocols: ['UDP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: ['ntp.ubuntu.com'],
      destinationPorts: ['123'],
    },
    //TODO: Remove this
    // {
    //   ruleType: 'NetworkRule',
    //   name: 'aks-time-others',
    //   description:
    //     'Required for Network Time Protocol (NTP) time synchronization on Linux nodes.',
    //   ipProtocols: ['UDP'],
    //   sourceAddresses: subnetSpaces,
    //   destinationAddresses: ['*'],
    //   destinationPorts: ['123'],
    // },
    {
      ruleType: 'NetworkRule',
      name: 'azure-services-tags',
      description: 'Allows internal services to connect to Azure Resources.',
      ipProtocols: ['TCP'],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [
        'AzureContainerRegistry',
        'MicrosoftContainerRegistry',
        'AzureActiveDirectory',
        'AzureMonitor',
        'AppConfiguration',
        'AzureKeyVault',
      ],
      destinationPorts: ['443'],
    },
    // {
    //   ruleType: 'NetworkRule',
    //   name: 'others-dns',
    //   description: 'Others DNS.',
    //   ipProtocols: ['TCP', 'UDP'],
    //   sourceAddresses: subnetSpaces,
    //   destinationAddresses: ['*'],
    //   destinationPorts: ['53'],
    // },
  );

  //AKS Apps Rules
  appRules.push(
    {
      ruleType: 'ApplicationRule',
      name: 'aks-services-fqdnTags',
      description: 'Allows pods to access AzureKubernetesService',
      sourceAddresses: subnetSpaces,
      fqdnTags: ['AzureKubernetesService'],
      protocols: [{ protocolType: 'Https', port: 443 }],
    },
    {
      ruleType: 'ApplicationRule',
      name: 'aks-fqdn',
      description: 'Azure Global required FQDN',
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        //AKS mater
        `*.hcp.${currentRegionCode}.azmk8s.io`,
        //Microsoft Container Registry
        ...trustedAcrs?.map((s) => `${s}.azurecr.io`),
        'mcr.microsoft.com',
        '*.mcr.microsoft.com',
        //'data.mcr.microsoft.com',
        //'*.data.mcr.microsoft.com',
        //Azure management
        'management.azure.com',
        'login.microsoftonline.com',
        //Microsoft trusted package repository
        'packages.microsoft.com',
      ],
      protocols: [{ protocolType: 'Https', port: 443 }],
    },
    {
      ruleType: 'ApplicationRule',
      name: 'azure-monitors',
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
      name: 'azure-policy',
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
  );

  if (allowAccessPublicRegistries) {
    appRules.push(
      {
        ruleType: 'ApplicationRule',
        name: 'docker-services',
        sourceAddresses: subnetSpaces,
        targetFqdns: ['*.docker.io', 'docker.io', '*.docker.com', '*.pkg.dev'],
        protocols: [{ protocolType: 'Https', port: 443 }],
      },
      {
        ruleType: 'ApplicationRule',
        name: 'k8s-services',
        sourceAddresses: subnetSpaces,
        targetFqdns: [
          'quay.io', //For Cert Manager
          '*.quay.io',
          'k8s.gcr.io', //nginx images
          'registry.k8s.io',
          '*.cloudfront.net',
          '*.amazonaws.com',
          '*.gcr.io',
          '*.googleapis.com',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
      },
      {
        ruleType: 'ApplicationRule',
        name: 'ubuntu-services',
        sourceAddresses: subnetSpaces,
        targetFqdns: [
          'security.ubuntu.com',
          'azure.archive.ubuntu.com',
          'changelogs.ubuntu.com',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
      },
    );
  }

  return FirewallPolicyGroup({
    policy: { name: 'aks-firewall-policy', dnatRules, netRules, appRules },
    priority,
    action: 'Allow',
  });
};
