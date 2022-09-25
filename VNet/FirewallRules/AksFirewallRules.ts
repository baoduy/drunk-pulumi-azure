import { input as inputs, enums } from '@pulumi/azure-native/types';
import { Input } from '@pulumi/pulumi';
import { FirewallRuleResults } from './types';

interface BasicRuleProps {
  startPriority: number;
}

interface NatRuleProps extends BasicRuleProps {
  publicIpAddress: Input<string>;
  //The internal IpAddress that allow public request go in
  internalIpAddress: Input<string>;
  //DNAT Apim request to dedicated internal IpAddress (The private APIs only allows access from APIM).
  apim?: {
    apimPublicIpAddress: Input<string>;
    internalIpAddress: Input<string>;
  };
}

const getNATRules = ({
  startPriority,
  internalIpAddress,
  publicIpAddress,
  apim,
}: NatRuleProps): Array<inputs.network.AzureFirewallNatRuleCollectionArgs> => {
  const rules = new Array<inputs.network.AzureFirewallNatRuleCollectionArgs>();
  //Inbound DNAT rules for API Ingress
  if (apim) {
    rules.push({
      name: 'aks-apim-nat-rules',
      action: { type: enums.network.AzureFirewallNatRCActionType.Dnat },
      priority: ++startPriority,

      rules: [
        {
          name: 'api-inbound-443',
          description: 'Forward APIM inbound port 443 to api IP of Ingress',
          sourceAddresses: [apim.apimPublicIpAddress],
          destinationAddresses: [publicIpAddress],
          destinationPorts: ['443'],
          protocols: ['TCP'],
          translatedAddress: apim.internalIpAddress,
          translatedPort: '443',
        },
      ],
    });
  }

  rules.push({
    name: 'aks-public-nat-rules',
    action: { type: enums.network.AzureFirewallNatRCActionType.Dnat },
    priority: ++startPriority,
    rules: [
      {
        name: 'public-inbound-443',
        description: 'Forward public inbound port 443 to api IP of Ingress',
        sourceAddresses: ['*'],
        destinationAddresses: [publicIpAddress],
        destinationPorts: ['443'],
        protocols: ['TCP'],
        translatedAddress: internalIpAddress,
        translatedPort: '443',
      },
      {
        name: 'public-inbound-80',
        description: 'Forward public inbound port 80 to api IP of Ingress',
        sourceAddresses: ['*'],
        destinationAddresses: [publicIpAddress],
        destinationPorts: ['80'],
        protocols: ['TCP'],
        translatedAddress: internalIpAddress,
        translatedPort: '80',
      },
    ],
  });

  return rules;
};

interface AksNetProps extends BasicRuleProps {
  /*The location of AKS default is southeastasia*/
  location?: string;
  vnetAddressSpace: Array<Input<string>>;
}

const getAksNetRules = ({
  startPriority,
  location = 'SoutheastAsia',
  vnetAddressSpace,
}: AksNetProps): inputs.network.AzureFirewallNetworkRuleCollectionArgs[] => {
  location = location.toLowerCase();

  const rules =
    new Array<inputs.network.AzureFirewallNetworkRuleCollectionArgs>();
  //============= Standard Rules for AKS ================== //
  //https://docs.microsoft.com/en-us/azure/aks/limit-egress-traffic

  rules.push({
    name: 'aks-net-rules',
    action: { type: enums.network.AzureFirewallRCActionType.Allow },
    priority: ++startPriority,
    rules: [
      // {
      //   name: 'aks-vpn',
      //   description:
      //     'For OPEN VPN tunneled secure communication between the nodes and the control plane for AzureCloud.SoutheastAsia',
      //   protocols: ['UDP'],
      //   sourceAddresses: vnetAddressSpace,
      //   destinationAddresses: [`AzureCloud.${location}`],
      //   destinationPorts: ['1194'],
      // },
      {
        name: 'aks-tcp',
        description:
          'For tunneled secure communication between the nodes and the control plane for AzureCloud.SoutheastAsia',
        protocols: ['TCP'],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: [`AzureCloud.${location}`],
        destinationPorts: ['443', '9000'],
      },
      {
        name: 'aks-time',
        description:
          'Required for Network Time Protocol (NTP) time synchronization on Linux nodes.',
        protocols: ['UDP'],
        sourceAddresses: vnetAddressSpace,
        destinationFqdns: ['ntp.ubuntu.com'],
        destinationPorts: ['123'],
      },
      {
        name: 'aks-time_others',
        description:
          'Required for Network Time Protocol (NTP) time synchronization on Linux nodes.',
        protocols: ['UDP'],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: ['*'],
        destinationPorts: ['123'],
      },
      // {
      //   name: 'aks-control-server',
      //   description:
      //     'Required if running pods/deployments that access the API Server, those pods/deployments would use the API IP.',
      //   protocols: ['TCP'],
      //   sourceAddresses: vnetAddressSpace,
      //   destinationAddresses: ['10.0.0.0/16'],//Ask default is '10.0.0.0/16'
      //   destinationPorts: ['443', '10250', '10251'],
      // },
      {
        name: 'azure-services-tags',
        description: 'Allows internal services to connect to Azure Resources.',
        protocols: ['TCP'],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: [
          'AzureContainerRegistry.SoutheastAsia',
          'MicrosoftContainerRegistry.SoutheastAsia',
          'AzureActiveDirectory',
          'AzureMonitor.SoutheastAsia',
          'AppConfiguration',
          'AzureKeyVault.SoutheastAsia',
          //'AzureSignalR', This already using private endpoint
          //'DataFactory.SoutheastAsia',
          //'EventHub.SoutheastAsia',
          'ServiceBus.SoutheastAsia',
          //'Sql.SoutheastAsia', This already using private endpoint
          'Storage.SoutheastAsia',
        ],
        destinationPorts: ['443'],
      },
      // {
      //   name: 'azure-dns',
      //   description: 'Azure DNS.',
      //   protocols: ['TCP', 'UDP'],
      //   sourceAddresses: vnetAddressSpace,
      //   destinationFqdns: [
      //     'ns1-01.azure-dns.com',
      //     'ns2-01.azure-dns.net',
      //     'ns3-01.azure-dns.org',
      //     'ns4-01.azure-dns.info',
      //   ],
      //   destinationPorts: ['53'],
      // },
      {
        name: 'others-dns',
        description: 'Others DNS.',
        protocols: ['TCP', 'UDP'],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: ['*'],
        destinationPorts: ['53'],
      },
    ],
  });

  return rules;
};

const getAKSAppRules = ({
  startPriority,
  vnetAddressSpace,
}: BasicRuleProps & {
  vnetAddressSpace: Array<Input<string>>;
}): inputs.network.AzureFirewallApplicationRuleCollectionArgs[] => {
  const rules =
    new Array<inputs.network.AzureFirewallApplicationRuleCollectionArgs>();
  //============= Standard Rules for AKS ================== //
  //https://docs.microsoft.com/en-us/azure/aks/limit-egress-traffic

  //AzureKubernetesService
  rules.push({
    name: 'aks-services-fqdn-rules',
    action: { type: enums.network.AzureFirewallRCActionType.Allow },
    priority: ++startPriority,
    rules: [
      {
        name: 'aks-services',
        description: 'Allows pods to access AzureKubernetesService',
        sourceAddresses: vnetAddressSpace,
        //AzureKubernetesService is allow to access google.com
        fqdnTags: ['AzureKubernetesService'],
      },
      {
        name: 'aks-fqdn',
        description: 'Azure Global required FQDN',
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          //AKS mater
          '*.hcp.southeastasia.azmk8s.io',
          //Microsoft Container Registry
          'mcr.microsoft.com',
          'data.mcr.microsoft.com',
          '*.data.mcr.microsoft.com',
          //Azure management
          'management.azure.com',
          'login.microsoftonline.com',
          //Microsoft trusted package repository
          'packages.microsoft.com',
          //Azure CDN
          'acs-mirror.azureedge.net',
          //CosmosDb
          '*.documents.azure.com',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
      },
      {
        name: 'azure-monitors',
        sourceAddresses: vnetAddressSpace,
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
        name: 'azure-policy',
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          '*.policy.core.windows.net',
          'gov-prod-policy-data.trafficmanager.net',
          'raw.githubusercontent.com',
          'dc.services.visualstudio.com',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
      },
      {
        //TODO Allow Docker Access is potential risk once we have budget and able to upload external images to ACR then remove docker.
        name: 'docker-services',
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          '*quay.io', //For Cert Manager
          '*auth.docker.io',
          '*cloudflare.docker.io',
          '*cloudflare.docker.com',
          '*registry-1.docker.io',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
      },
      {
        //TODO Allow external registry is potential risk once we have budget and able to upload external images to ACR then remove docker.
        name: 'k8s-services',
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          'k8s.gcr.io', //nginx images
          '*.k8s.io',
          'storage.googleapis.com',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
      },
      {
        name: 'ubuntu-services',
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          'security.ubuntu.com',
          'azure.archive.ubuntu.com',
          'changelogs.ubuntu.com',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
      },
    ],
  });

  return rules;
};

export interface AksFirewallProps
  extends BasicRuleProps,
    NatRuleProps,
    AksNetProps {}

export default ({
  startPriority,
  vnetAddressSpace,
  ...others
}: AksFirewallProps): FirewallRuleResults => {
  const natRuleCollections = getNATRules({
    startPriority,
    ...others,
  });

  const networkRuleCollections = getAksNetRules({
    startPriority,
    vnetAddressSpace,
    ...others,
  });

  const applicationRuleCollections = getAKSAppRules({
    startPriority,
    vnetAddressSpace,
  });

  return {
    natRuleCollections,
    networkRuleCollections,
    applicationRuleCollections,
  };
};
