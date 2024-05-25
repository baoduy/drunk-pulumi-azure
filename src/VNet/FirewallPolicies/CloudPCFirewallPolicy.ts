import { Input } from "@pulumi/pulumi";
import { currentRegionCode } from "../../Common/AzureEnv";
import { convertPolicyToGroup } from "../Helper";
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from "../types";

interface Props {
  priority: number;

  subnetSpaces: Array<Input<string>>;
  allowAllOutbound?: boolean;
  allowIpCheckApi?: boolean;
  allowsAzure?: boolean;
  allowsK8sLens?: boolean;
  allowsSearch?: boolean;
  allowsOffice365?: boolean;
}

export default ({
  priority,
  subnetSpaces,
  allowsOffice365,
  allowsAzure,
  allowsK8sLens,
  allowIpCheckApi,
  allowsSearch,
  allowAllOutbound,
}: Props): FirewallPolicyRuleCollectionResults => {
  const netRules = new Array<Input<NetworkRuleArgs>>();
  const appRules = new Array<Input<ApplicationRuleArgs>>();

  if (allowAllOutbound) {
    netRules.push({
      ruleType: "NetworkRule",
      name: "cloudpc-net-allow-all-outbound",
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
    name: "cloudpc-app-allow-fqdnTags",
    description: "Allows Windows Updates",
    sourceAddresses: subnetSpaces,
    fqdnTags: ["WindowsUpdate", "WindowsDiagnostics"],
    protocols: [{ protocolType: "Https", port: 443 }],
  });

  if (allowsAzure) {
    netRules.push({
      ruleType: "NetworkRule",
      name: "cloudpc-net-allows-azure",
      description: "Allows Cloud PC to access to Azure.",
      ipProtocols: ["TCP", "UDP"],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [`AzureCloud.${currentRegionCode}`],
      destinationPorts: ["443", "445", "22"],
    });

    netRules.push({
      ruleType: "NetworkRule",
      name: "cloudpc-net-allows-azure-all",
      description: "Allows Cloud PC to access to Azure.",
      ipProtocols: ["TCP", "UDP"],
      sourceAddresses: subnetSpaces,
      destinationAddresses: [`AzureCloud`],
      destinationPorts: ["443", "445", "22"],
    });

    appRules.push({
      ruleType: "ApplicationRule",
      name: "cloudpc-app-allow-azure-fqdnTags",
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
      name: "cloudpc-app-allow-access-azure-portal",
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

  if (allowsK8sLens) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: "cloudpc-app-allow-k8s-lens",
      description: "Allows K8s Lens",
      sourceAddresses: subnetSpaces,
      targetFqdns: ["*.k8slens.dev", "github.com", "*.githubassets.com"],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }

  if (allowsOffice365) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: "cloudpc-app-allow-office365",
      description: "Allows Office365",
      sourceAddresses: subnetSpaces,
      fqdnTags: ["Office365", "Office365.SharePoint"],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }

  if (allowsSearch) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: "cloudpc-app-allow-search-engines",
      description: "Allows Search Engines",
      sourceAddresses: subnetSpaces,
      targetFqdns: ["google.com", "www.google.com", "bing.com", "www.bing.com"],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }

  if (allowIpCheckApi) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: "cloudpc-app-allow-ip-checks",
      description: "Allows Ip Checks",
      sourceAddresses: subnetSpaces,
      targetFqdns: ["ip.me", "ifconfig.me", "*.ifconfig.me"],
      protocols: [{ protocolType: "Https", port: 443 }],
    });
  }

  return convertPolicyToGroup({
    policy: { name: "cloud-pc-firewall-policy", netRules, appRules },
    priority,
    action: "Allow",
  });
};
