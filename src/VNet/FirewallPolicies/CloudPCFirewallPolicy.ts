import { Input } from "@pulumi/pulumi";
import { currentRegionCode } from "../../Common/AzureEnv";
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from "../types";
import { FirewallPolicyGroup } from "../FirewallPolicy";

interface Props {
  name?: string;
  priority: number;
  subnetSpaces: Array<Input<string>>;
  allowAllOutbound?: boolean;
  allowIpCheckApi?: boolean;
  allowsAzure?: boolean;
  allowsAzDevOps?: boolean;
  allowsK8sTools?: boolean;
  allowsSearch?: boolean;
  allowsOffice365?: boolean;
  allowsWindows365?: boolean;
}

export default ({
  name = "cloud-pc",
  priority,
  subnetSpaces,
  allowsOffice365,
  allowsWindows365,
  allowsAzure,
  allowsAzDevOps,
  allowsK8sTools,
  allowIpCheckApi,
  allowsSearch,
  allowAllOutbound,
}: Props): FirewallPolicyRuleCollectionResults => {
  const netRules = new Array<Input<NetworkRuleArgs>>();
  const appRules = new Array<Input<ApplicationRuleArgs>>();

  if (allowAllOutbound) {
    netRules.push({
      ruleType: "NetworkRule",
      name: `${name}-net-allow-all-outbound`,
      description: "CloudPc allows all outbound",
      ipProtocols: ["TCP"],
      sourceAddresses: subnetSpaces,
      destinationAddresses: ["*"],
      destinationPorts: ["443"],
    });
  }

  //Default PC Rules
  appRules.push({
    ruleType: "ApplicationRule",
    name: `${name}-app-allow-fqdnTags`,
    description: "Allows Windows Updates",
    sourceAddresses: subnetSpaces,
    fqdnTags: ["WindowsUpdate", "WindowsDiagnostics"],
    protocols: [{ protocolType: "Https", port: 443 }],
  });

  if (allowsAzure) {
    netRules.push({
      ruleType: "NetworkRule",
      name: `${name}-net-allows-azure`,
      description: "Allows Cloud PC to access to Azure.",
      ipProtocols: ["TCP", "UDP"],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [`AzureCloud.${currentRegionCode}`],
      destinationPorts: ["443", "445", "22"],
    });

    netRules.push({
      ruleType: "NetworkRule",
      name: `${name}-net-allows-azure-all`,
      description: "Allows Cloud PC to access to Azure.",
      ipProtocols: ["TCP", "UDP"],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [`AzureCloud`],
      destinationPorts: ["443", "445", "22"],
    });

    appRules.push({
      ruleType: "ApplicationRule",
      name: `${name}-app-allow-azure-fqdnTags`,
      description: "Allows Windows Updates",
      sourceAddresses: subnetSpaces,
      fqdnTags: [
        "AzureBackup",
        "AzureKubernetesService",
        "AzureActiveDirectoryDomainServices",
      ],
      protocols: [{ protocolType: "Https", port: 443 }],
    });

    appRules.push({
      ruleType: "ApplicationRule",
      name: `${name}-app-allow-access-azure-portal`,
      description: "Allows Ip Azure Portal",
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        "*.azure.com",
        "*.azure.net",
        "*.microsoftonline.com",
        "*.msauth.net",
        "*.msauthimages.net",
        "*.msecnd.net",
        "*.msftauth.net",
        "*.msftauthimages.net",
      ],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }

  if (allowsAzDevOps) {
    netRules.push({
      ruleType: "NetworkRule",
      name: `${name}-net-allow-AzureDevOps`,
      description: "AzureDevOps",
      ipProtocols: ["TCP"],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [
        "13.107.6.0/24",
        "13.107.9.0/24",
        "13.107.42.0/24",
        "13.107.43.0/24",
      ],
      destinationPorts: ["443"],
    });
    appRules.push({
      ruleType: "ApplicationRule",
      name: `${name}-app-allow-azure-resources`,
      description: "Allows Azure Resources",
      protocols: [{ protocolType: "Https", port: 443 }],
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        //Azure DevOps
        "*.dev.azure.com",
        "*.vsassets.io",
        "*gallerycdn.vsassets.io",
        "*vstmrblob.vsassets.io",
        "aadcdn.msauth.net",
        "aadcdn.msftauth.net",
        "aex.dev.azure.com",
        "aexprodea1.vsaex.visualstudio.com",
        "amcdn.msftauth.net",
        "amp.azure.net",
        "app.vssps.dev.azure.com",
        "app.vssps.visualstudio.com",
        "*.vssps.visualstudio.com",
        "azure.microsoft.com",
        "azurecomcdn.azureedge.net",
        "cdn.vsassets.io",
        "dev.azure.com",
        "go.microsoft.com",
        "graph.microsoft.com",
        "live.com",
        "login.live.com",
        "login.microsoftonline.com",
        "management.azure.com",
        "management.core.windows.net",
        "microsoft.com",
        "microsoftonline.com",
        "static2.sharepointonline.com",
        "visualstudio.com",
        "vsrm.dev.azure.com",
        "vstsagentpackage.azureedge.net",
        "windows.net",
        "login.microsoftonline.com",
        "app.vssps.visualstudio.com",
        "*.blob.core.windows.net",
      ],
    });
  }

  if (allowsK8sTools) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: `${name}-app-allow-k8s-lens`,
      description: "Allows K8s Lens",
      sourceAddresses: subnetSpaces,
      targetFqdns: [
        "*.k8slens.dev",
        "github.com",
        "*.githubassets.com",
        "*.githubusercontent.com",
        "*.googleapis.com",
        "aka.ms",
        "*.chocolatey.org",
      ],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }

  if (allowsOffice365) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: `${name}-app-allow-office365`,
      description: "Allows Office365",
      sourceAddresses: subnetSpaces,
      fqdnTags: ["Office365", "Office365.SharePoint"],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }
  if (allowsWindows365) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: `${name}-app-allow-win365`,
      description: "Allows Windows365",
      sourceAddresses: subnetSpaces,
      fqdnTags: ["Windows365", "MicrosoftIntune"],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
    netRules.push(
      {
        ruleType: "NetworkRule",
        name: `${name}-net-allow-win365-windows-net`,
        description: "CloudPc allows Windows 365 windows.net",
        ipProtocols: ["TCP"],
        sourceAddresses: subnetSpaces,
        destinationFqdns: ["azkms.core.windows.net"],
        destinationPorts: ["1688"],
      },
      {
        ruleType: "NetworkRule",
        name: `${name}-net-allow-win365-azure-devices`,
        description: "CloudPc allows Windows 365 azure-devices",
        ipProtocols: ["TCP"],
        sourceAddresses: subnetSpaces,
        destinationFqdns: [
          "global.azure-devices-provisioning.net",
          "*.azure-devices.net",
        ],
        destinationPorts: ["443", "5671"],
      },
      {
        ruleType: "NetworkRule",
        name: `${name}-net-allow-win365-udp-tcp`,
        description: "CloudPc allows Windows 365 udp tcp",
        ipProtocols: ["UDP", "TCP"],
        sourceAddresses: subnetSpaces,
        destinationAddresses: ["20.202.0.0/16"],
        destinationPorts: ["443", "3478"],
      },
    );
  }

  if (allowsSearch) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: `${name}-app-allow-search-engines`,
      description: "Allows Search Engines",
      sourceAddresses: subnetSpaces,
      targetFqdns: ["google.com", "www.google.com", "bing.com", "www.bing.com"],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }

  if (allowIpCheckApi) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: `${name}-app-allow-ip-checks`,
      description: "Allows Ip Checks",
      sourceAddresses: subnetSpaces,
      targetFqdns: ["ip.me", "ifconfig.me", "*.ifconfig.me"],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }

  return FirewallPolicyGroup({
    policy: { name: `${name}-firewall-policy`, netRules, appRules },
    priority,
    action: "Allow",
  });
};
