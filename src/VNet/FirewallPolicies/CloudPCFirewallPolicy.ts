import { Input } from "@pulumi/pulumi";
import { FirewallPolicyResults } from "../FirewallRules/types";
import { input as inputs } from "@pulumi/azure-native/types";

interface Props {
  vnetAddressSpace: Array<Input<string>>;
  allowFullOutboundAddress?: Array<Input<string>>;
  allowIpCheckApi?: boolean;
  enableCloudPcRules?: boolean;
  enableDeveloperResources?: boolean;
  enableAzureResources?: boolean;
}

export default ({
  vnetAddressSpace,
  enableCloudPcRules = true,
  enableDeveloperResources = true,
  enableAzureResources = true,
  allowIpCheckApi = true,
  allowFullOutboundAddress,
}: Props): FirewallPolicyResults => {
  const netRules = new Array<Input<inputs.network.NetworkRuleArgs>>();
  const appRules = new Array<Input<inputs.network.ApplicationRuleArgs>>();

  if (allowFullOutboundAddress) {
    netRules.push({
      ruleType: "NetworkRule",
      name: "allow-out-all",
      description: "Allow out all",
      ipProtocols: ["TCP"],
      sourceAddresses: allowFullOutboundAddress,
      destinationAddresses: ["*"],
      destinationPorts: ["443"],
    });
  }

  if (enableCloudPcRules) {
    netRules.push(
      {
        ruleType: "NetworkRule",
        name: "allow-AVD-traffic",
        description: "AVD traffic",
        ipProtocols: ["TCP"],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: ["169.254.169.254", "168.63.129.16"],
        destinationPorts: ["80"],
      },
      {
        ruleType: "NetworkRule",
        name: "allow-AVD-WA",
        description: "AVD WA",
        ipProtocols: ["TCP"],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: ["23.102.135.246"],
        destinationPorts: ["1688"],
      },
      {
        ruleType: "NetworkRule",
        name: "allow-time-sync",
        description: "Win time sync",
        ipProtocols: ["UDP"],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: ["time.windows.com"],
        destinationPorts: ["123"],
      },
      {
        ruleType: "NetworkRule",
        name: "allow-AzureDevOps",
        description: "AzureDevOps",
        ipProtocols: ["TCP"],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: [
          "13.107.6.0/24",
          "13.107.9.0/24",
          "13.107.42.0/24",
          "13.107.43.0/24",
        ],
        destinationPorts: ["443"],
      },
      {
        ruleType: "NetworkRule",
        name: "allow-Azure-Db",
        description: "Allows Azure Sql",
        ipProtocols: ["TCP"],
        sourceAddresses: vnetAddressSpace,
        destinationAddresses: [`Sql.SoutheastAsia`],
        destinationPorts: ["1433", "1434", "11000-11999", "14000-14999"],
      },
    );

    appRules.push(
      {
        ruleType: "ApplicationRule",
        name: "allow-AVD-vvd",
        description: "WindowsVirtualDesktop traffic",
        sourceAddresses: vnetAddressSpace,
        fqdnTags: ["WindowsVirtualDesktop"],
      },
      {
        ruleType: "ApplicationRule",
        name: "allow-AVD-Diagnostics",
        description: "WindowsVirtualDesktop Diagnostics",
        sourceAddresses: vnetAddressSpace,
        //protocols: [{ protocolType: 'Https', port: 443 }],
        fqdnTags: ["WindowsDiagnostics"],
      },
      {
        ruleType: "ApplicationRule",
        name: "allow-AVD-Update",
        description: "WindowsVirtualDesktop Update",
        sourceAddresses: vnetAddressSpace,
        //protocols: [{ protocolType: 'Https', port: 443 }],
        fqdnTags: ["WindowsUpdate"],
      },
      {
        ruleType: "ApplicationRule",
        name: "allow-AVD-times",
        description: "Allow ADV Times",
        protocols: [{ protocolType: "Https", port: 443 }],
        sourceAddresses: vnetAddressSpace,
        targetFqdns: ["*.core.windows.net", "*.servicebus.windows.net"],
      },
    );
  }

  if (enableDeveloperResources) {
    appRules.push(
      {
        ruleType: "ApplicationRule",
        name: "allow-others-https",
        description: "Allow others HTTPs",
        protocols: [{ protocolType: "Https", port: 443 }],
        sourceAddresses: vnetAddressSpace,
        targetFqdns: [
          "*.digicert.com",

          //Draw.io
          "draw.io",
          "draw.net",
          "*.draw.io",
          "*.draw.net",
          "*.diagrams.net",

          "python.org",
          "*.pulumi.com",
        ],
      },
      {
        ruleType: "ApplicationRule",
        name: "allow-others-http",
        description: "Allow others HTTP",
        protocols: [{ protocolType: "Http", port: 80 }],
        sourceAddresses: vnetAddressSpace,
        targetFqdns: ["*.digicert.com"],
      },
      {
        ruleType: "ApplicationRule",
        name: "allow-choco",
        description: "Allow choco",
        protocols: [
          { protocolType: "Http", port: 80 },
          { protocolType: "Https", port: 443 },
        ],
        sourceAddresses: vnetAddressSpace,
        targetFqdns: ["*.chocolatey.org", "chocolatey.org"],
      },
    );
  }

  if (enableAzureResources) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: "allow-azure-resources",
      description: "Allows Azure Resources",
      protocols: [{ protocolType: "Https", port: 443 }],
      sourceAddresses: vnetAddressSpace,
      targetFqdns: [
        //AKS
        "*.hcp.southeastasia.azmk8s.io",
        "dl.k8s.io",
        "*.googleapis.com",

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
        "transwap.visualstudio.com",
        "*.blob.core.windows.net",
        "transwap.vsrm.visualstudio.com",
        "transwap.vstmr.visualstudio.com",
        "transwap.pkgs.visualstudio.com",
        "transwap.vssps.visualstudio.com",

        //Office 365
        "transwapo365-my.sharepoint.com",
        "admin.microsoft.com",
        "*.office365.com",
        "*.outlook.com",
        "*.office.com",
        "*.outlook.office.com",
        "attachments.office.net",
        "*.protection.outlook.com",
        "*.mail.protection.outlook.com",
        "*.officeapps.live.com",
        "*.online.office.com",
        "office.live.com",
        "*.aria.microsoft.com",
        "*.events.data.microsoft.com",
        "*.o365weve.com",
        "amp.azure.net",
        "appsforoffice.microsoft.com",
        "assets.onestore.ms",
        "auth.gfx.ms",
        "c1.microsoft.com",
        "contentstorage.osi.office.net",
        "dgps.support.microsoft.com",
        "docs.microsoft.com",
        "msdn.microsoft.com",
        "platform.linkedin.com",
        "prod.msocdn.com",
        "shellprod.msocdn.com",
        "*.cdn.office.net",
        "support.content.office.net",
        "support.microsoft.com",
        "technet.microsoft.com",
        "videocontent.osi.office.net",
        "videoplayercdn.osi.office.net",
        "identity.nel.measure.office.net",

        //Azure
        "*.login.microsoftonline.com",
        "*.aadcdn.microsoftonline-p.com",
        "*.aka.ms",
        "*.applicationinsights.io",
        "*.azure.com",
        "*.azure.net",
        "*.azure-api.net",
        "*.azuredatalakestore.net",
        "*.azureedge.net",
        "*.loganalytics.io",
        "*.microsoft.com",
        "*.microsoftonline.com",
        "*.microsoftonline-p.com",
        "*.msauth.net",
        "*.msftauth.net",
        "*.trafficmanager.net",
        "*.visualstudio.com",
        "*.windows.net",
        "*.windows-int.net",
        "*.wns.windows.com",
        "*.activity.windows.com",
        "*.mp.microsoft.com",

        //PowerBI
        "*.powerbi.com",
        "*.analysis.windows.net",
        "*.frontend.clouddatahub.net",
        "*.msftncsi.com",
        "*.dc.services.visualstudio.com",
      ],
    });
  }

  if (allowIpCheckApi) {
    appRules.push({
      ruleType: "ApplicationRule",
      name: "allow-ip-checks",
      description: "Allows Ip Checks",
      protocols: [{ protocolType: "Https", port: 443 }],
      sourceAddresses: vnetAddressSpace,
      targetFqdns: ["*.ipify.org", "*.myip.com", "ip.me"],
    });
  }

  return {
    name: "cloud-pc-firewall-policy",
    netRules,
    appRules,
  };
};
