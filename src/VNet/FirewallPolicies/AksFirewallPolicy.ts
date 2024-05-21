import { Input, interpolate } from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/azure-native/types";
import { FirewallRuleProps } from "../FirewallRules/types";
import { getLocation } from "../../Common/Location";
import { currentLocation } from "../../Common/AzureEnv";

interface Props {
  name?: string;
  vnetAddressSpace: Array<Input<string>>;
  location?: Input<string>;
  privateCluster?: boolean;
  /** Allows access to Docker and Kubenetes registries */
  allowAccessPublicRegistries?: boolean;

  natRule?: {
    publicIpAddress: Input<string>;
    //The internal IpAddress that allow public request go in
    internalIpAddress: Input<string>;
    //DNAT Apim request to dedicated internal IpAddress (The private APIs only allows access from APIM).
    apim?: {
      apimPublicIpAddress: Input<string>;
      internalIpAddress: Input<string>;
    };
  };
}

export default ({
  name = "aks-firewall-policy",
  location = currentLocation,
  privateCluster,
  allowAccessPublicRegistries,
  vnetAddressSpace,
  natRule,
}: Props): FirewallRuleProps => {
  location = getLocation(location);

  const dnatRules = new Array<Input<inputs.network.NatRuleArgs>>();
  const netRules = new Array<Input<inputs.network.NetworkRuleArgs>>();
  const appRules = new Array<Input<inputs.network.ApplicationRuleArgs>>();

  if (natRule) {
    if (natRule.apim) {
      dnatRules.push({
        ruleType: "NatRule",
        name: "apim-inbound-443",
        description: "Forward APIM inbound port 443 to api IP of Ingress",
        sourceAddresses: [natRule.apim.apimPublicIpAddress],
        destinationAddresses: [natRule.publicIpAddress],
        destinationPorts: ["443"],
        ipProtocols: ["TCP"],
        translatedAddress: natRule.apim.internalIpAddress,
        translatedPort: "443",
      });
    }

    dnatRules.push(
      {
        ruleType: "NatRule",
        name: "public-inbound-443",
        description: "Forward public inbound port 443 to api IP of Ingress",
        sourceAddresses: ["*"],
        destinationAddresses: [natRule.publicIpAddress],
        destinationPorts: ["443"],
        ipProtocols: ["TCP"],
        translatedAddress: natRule.internalIpAddress,
        translatedPort: "443",
      },
      {
        ruleType: "NatRule",
        name: "public-inbound-80",
        description: "Forward public inbound port 80 to api IP of Ingress",
        sourceAddresses: ["*"],
        destinationAddresses: [natRule.publicIpAddress],
        destinationPorts: ["80"],
        ipProtocols: ["TCP"],
        translatedAddress: natRule.internalIpAddress,
        translatedPort: "80",
      },
    );
  }

  if (!privateCluster) {
    //Net Rules for non-private cluster
    netRules.push({
      ruleType: "NetworkRule",
      name: "aks-tcp",
      description:
        "For tunneled secure communication between the nodes and the control plane for AzureCloud.SoutheastAsia",
      ipProtocols: ["TCP"],
      sourceAddresses: vnetAddressSpace,
      destinationAddresses: [interpolate`AzureCloud.${location}`],
      destinationPorts: ["443", "9000"],
    });

    //App rule for non-private cluster
    appRules.push(
      {
        ruleType: "ApplicationRule",
        name: "aks-services",
        description: "Allows pods to access AzureKubernetesService",
        sourceAddresses: vnetAddressSpace,
        //AzureKubernetesService is allowed to access google.com
        fqdnTags: ["AzureKubernetesService"],
      },
      {
        ruleType: "ApplicationRule",
        name: "aks-controller",
        description: "Allows pods to access AKS controller",
        sourceAddresses: vnetAddressSpace,
        protocols: [{ port: 443, protocolType: "Https" }],
        targetFqdns: [interpolate`*.hcp.${location}.azmk8s.io`],
      },
    );
  }

  if (allowAccessPublicRegistries) {
    appRules.push(
      {
        ruleType: "ApplicationRule",
        //TODO Allow Docker Access is potential risk once we have budget and able to upload external images to ACR then remove docker.
        name: "docker-services",
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          "*quay.io", //For Cert Manager
          "*auth.docker.io",
          "*cloudflare.docker.io",
          "*cloudflare.docker.com",
          "*registry-1.docker.io",
        ],
        protocols: [{ protocolType: "Https", port: 443 }],
      },
      {
        ruleType: "ApplicationRule",
        //TODO Allow external registry is potential risk once we have budget and able to upload external images to ACR then remove docker.
        name: "k8s-services",
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          "k8s.gcr.io", //nginx images
          "*.k8s.io",
          "storage.googleapis.com",
        ],
        protocols: [{ protocolType: "Https", port: 443 }],
      },
    );
  }

  return {
    name,
    dnatRules,
    networkRules: [
      ...netRules,
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
        ruleType: "NetworkRule",
        name: "aks-time",
        description:
          "Required for Network Time Protocol (NTP) time synchronization on Linux nodes.",
        ipProtocols: ["UDP"],
        sourceAddresses: vnetAddressSpace,
        destinationFqdns: ["ntp.ubuntu.com"],
        destinationPorts: ["123"],
      },
      {
        ruleType: "NetworkRule",
        name: "aks-time_others",
        description:
          "Required for Network Time Protocol (NTP) time synchronization on Linux nodes.",
        ipProtocols: ["UDP"],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: ["*"],
        destinationPorts: ["123"],
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
        ruleType: "NetworkRule",
        name: "azure-services-tags",
        description: "Allows internal services to connect to Azure Resources.",
        ipProtocols: ["TCP"],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: [
          interpolate`AzureContainerRegistry.${location}`,
          interpolate`MicrosoftContainerRegistry.${location}`,
          "AzureActiveDirectory",
          interpolate`AzureMonitor.${location}`,
          "AppConfiguration",
        ],
        destinationPorts: ["443"],
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
        ruleType: "NetworkRule",
        name: "others-dns",
        description: "Others DNS.",
        ipProtocols: ["TCP", "UDP"],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: ["*"],
        destinationPorts: ["53"],
      },
    ],
    applicationRules: [
      ...appRules,
      {
        ruleType: "ApplicationRule",
        name: "aks-fqdn",
        description: "Azure Global required FQDN",
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          //Microsoft Container Registry
          "mcr.microsoft.com",
          "data.mcr.microsoft.com",
          "*.data.mcr.microsoft.com",
          //Azure management
          "management.azure.com",
          "login.microsoftonline.com",
          //Microsoft trusted package repository
          "packages.microsoft.com",
          //Azure CDN
          "acs-mirror.azureedge.net",
          //CosmosDb
          "*.documents.azure.com",
        ],
        protocols: [{ protocolType: "Https", port: 443 }],
      },
      {
        ruleType: "ApplicationRule",
        name: "azure-monitors",
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          "dc.services.visualstudio.com",
          "*.ods.opinsights.azure.com",
          "*.oms.opinsights.azure.com",
          "*.monitoring.azure.com",
          "*.services.visualstudio.com",
        ],
        protocols: [{ protocolType: "Https", port: 443 }],
      },
      {
        ruleType: "ApplicationRule",
        name: "azure-policy",
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          "*.policy.core.windows.net",
          "gov-prod-policy-data.trafficmanager.net",
          "raw.githubusercontent.com",
          "dc.services.visualstudio.com",
        ],
        protocols: [{ protocolType: "Https", port: 443 }],
      },
      {
        ruleType: "ApplicationRule",
        name: "ubuntu-services",
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          "security.ubuntu.com",
          "azure.archive.ubuntu.com",
          "changelogs.ubuntu.com",
        ],
        protocols: [{ protocolType: "Https", port: 443 }],
      },
    ],
  };
};
