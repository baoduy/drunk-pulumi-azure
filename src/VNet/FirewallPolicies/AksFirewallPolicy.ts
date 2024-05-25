import { Input } from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/azure-native/types";
import { currentRegionCode } from "../../Common/AzureEnv";
import { convertPolicyToGroup } from "../Helper";
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from "../types";

interface AzureFirewallPolicyProps {
  priority: number;

  vnetAddressSpace: Array<Input<string>>;
  /** Allows access to Docker and Kubernetes registries */
  allowAccessPublicRegistries?: boolean;

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
  vnetAddressSpace,
  dNATs,
}: AzureFirewallPolicyProps): FirewallPolicyRuleCollectionResults => {
  const dnatRules = new Array<Input<inputs.network.NatRuleArgs>>();
  const netRules = new Array<Input<NetworkRuleArgs>>();
  const appRules = new Array<Input<ApplicationRuleArgs>>();

  if (dNATs) {
    dNATs.forEach((nat) => {
      dnatRules.push({
        ruleType: "NatRule",
        name: `${nat.name}-inbound-443`,
        description: `Forward port 443 external IpAddress of ${nat.name} to internal IpAddress`,
        sourceAddresses: [nat.sourceIpAddress ?? "*"],
        destinationAddresses: nat.publicIpAddresses,
        destinationPorts: ["443"],
        ipProtocols: ["TCP"],
        translatedAddress: nat.internalIpAddress,
        translatedPort: "443",
      });

      if (nat.allowHttp)
        dnatRules.push({
          ruleType: "NatRule",
          name: `${nat.name}-inbound-80`,
          description: `Forward port 80 external IpAddress of ${nat.name} to internal IpAddress`,
          sourceAddresses: [nat.sourceIpAddress ?? "*"],
          destinationAddresses: nat.publicIpAddresses,
          destinationPorts: ["80"],
          ipProtocols: ["TCP"],
          translatedAddress: nat.internalIpAddress,
          translatedPort: "80",
        });
    });
  }

  //AKS Network Rules
  netRules.push(
    {
      ruleType: "NetworkRule",
      name: "aks-vpn",
      description:
        "For OPEN VPN tunneled secure communication between the nodes and the control plane for AzureCloud.SoutheastAsia",
      ipProtocols: ["UDP"],
      sourceAddresses: vnetAddressSpace,
      destinationAddresses: [`AzureCloud.${currentRegionCode}`],
      destinationPorts: ["1194"],
    },
    {
      ruleType: "NetworkRule",
      name: "aks-tcp",
      description:
        "For tunneled secure communication between the nodes and the control plane for AzureCloud.SoutheastAsia",
      ipProtocols: ["TCP"],
      sourceAddresses: vnetAddressSpace,
      destinationAddresses: [`AzureCloud.${currentRegionCode}`],
      destinationPorts: ["443", "9000"],
    },
    {
      ruleType: "NetworkRule",
      name: "aks-time",
      description:
        "Required for Network Time Protocol (NTP) time synchronization on Linux nodes.",
      ipProtocols: ["UDP"],
      sourceAddresses: vnetAddressSpace,
      destinationAddresses: ["ntp.ubuntu.com"],
      destinationPorts: ["123"],
    },
    //TODO: Remove this
    {
      ruleType: "NetworkRule",
      name: "aks-time-others",
      description:
        "Required for Network Time Protocol (NTP) time synchronization on Linux nodes.",
      ipProtocols: ["UDP"],
      sourceAddresses: vnetAddressSpace,
      destinationAddresses: ["*"],
      destinationPorts: ["123"],
    },
    {
      ruleType: "NetworkRule",
      name: "azure-services-tags",
      description: "Allows internal services to connect to Azure Resources.",
      ipProtocols: ["TCP"],
      sourceAddresses: vnetAddressSpace,
      destinationAddresses: [
        "AzureContainerRegistry.SoutheastAsia",
        "MicrosoftContainerRegistry.SoutheastAsia",
        "AzureActiveDirectory",
        "AzureMonitor.SoutheastAsia",
        "AppConfiguration",
        "AzureKeyVault.SoutheastAsia",
        //'AzureConnectors.SoutheastAsia',
        //'AzureSignalR', This already using private endpoint
        //'DataFactory.SoutheastAsia',
        //'EventHub.SoutheastAsia',
        "ServiceBus.SoutheastAsia",
        //'Sql.SoutheastAsia', This already using private endpoint
        "Storage.SoutheastAsia",
      ],
      destinationPorts: ["443"],
    },
    {
      ruleType: "NetworkRule",
      name: "others-dns",
      description: "Others DNS.",
      ipProtocols: ["TCP", "UDP"],
      sourceAddresses: vnetAddressSpace,
      destinationAddresses: ["*"],
      destinationPorts: ["53"],
    },
  );

  //AKS Apps Rules
  appRules.push(
    {
      ruleType: "ApplicationRule",
      name: "aks-services-fqdnTags",
      description: "Allows pods to access AzureKubernetesService",
      sourceAddresses: vnetAddressSpace,
      fqdnTags: ["AzureKubernetesService"],
      protocols: [{ protocolType: "Https", port: 443 }],
    },
    {
      ruleType: "ApplicationRule",
      name: "aks-fqdn",
      description: "Azure Global required FQDN",
      sourceAddresses: vnetAddressSpace,
      targetFqdns: [
        //AKS mater
        "*.hcp.southeastasia.azmk8s.io",
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
        //"acs-mirror.azureedge.net",
        //CosmosDb
        //"*.documents.azure.com",
      ],
      protocols: [{ protocolType: "Https", port: 443 }],
    },
    {
      ruleType: "ApplicationRule",
      name: "azure-monitors",
      description: "Azure AKS Monitoring",
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
      description: "Azure AKS Policy Management",
      sourceAddresses: vnetAddressSpace,
      targetFqdns: [
        "*.policy.core.windows.net",
        "gov-prod-policy-data.trafficmanager.net",
        "raw.githubusercontent.com",
        "dc.services.visualstudio.com",
      ],
      protocols: [{ protocolType: "Https", port: 443 }],
    },
  );

  if (allowAccessPublicRegistries) {
    appRules.push(
      {
        ruleType: "ApplicationRule",
        //TODO Allow Docker Access is potential risk once we have budget and able to upload external images to ACR then remove docker.
        name: "docker-services",
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          "quay.io", //For Cert Manager
          "registry.k8s.io",
          "*.cloudfront.net",
          "*.quay.io",
          "auth.docker.io",
          "*.auth.docker.io",
          "*.cloudflare.docker.io",
          "docker.io",
          "cloudflare.docker.io",
          "cloudflare.docker.com",
          "*.cloudflare.docker.com",
          "*.registry-1.docker.io",
          "registry-1.docker.io",
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
          "asia-east1-docker.pkg.dev",
          "prod-registry-k8s-io-ap-southeast-1.s3.dualstack.ap-southeast-1.amazonaws.com",
          "*.gcr.io",
          "*.googleapis.com",
        ],
        protocols: [{ protocolType: "Https", port: 443 }],
      },
      {
        ruleType: "ApplicationRule",
        //TODO Allow external registry is potential risk once we have budget and able to upload external images to ACR then remove docker.
        name: "ubuntu-services",
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          "security.ubuntu.com",
          "azure.archive.ubuntu.com",
          "changelogs.ubuntu.com",
        ],
        protocols: [{ protocolType: "Https", port: 443 }],
      },
    );
  }

  return convertPolicyToGroup({
    policy: { name: "aks-firewall-policy", dnatRules, netRules, appRules },
    priority,
    action: "Allow",
  });
};
