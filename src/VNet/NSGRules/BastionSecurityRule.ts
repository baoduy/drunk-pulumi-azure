import { CustomSecurityRuleArgs } from "../types";

interface Props {
  bastionAddressPrefix: string;
  startPriority?: number;
}

/** The Security group rules for Bastion */
// https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
export default ({ bastionAddressPrefix, startPriority = 3000 }: Props) => {
  const rs = new Array<CustomSecurityRuleArgs>();
  //Inbound
  rs.push(
    {
      name: "BastionAllowsHttpsInbound",
      sourceAddressPrefix: "Internet",
      sourcePortRange: "*",
      destinationAddressPrefix: bastionAddressPrefix,
      destinationPortRange: "443",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsGatewayManagerInbound",
      sourceAddressPrefix: "GatewayManager",
      sourcePortRange: "*",
      destinationAddressPrefix: "*",
      destinationPortRange: "443",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsAzureBalancerInbound",
      sourceAddressPrefix: "AzureLoadBalancer",
      sourcePortRange: "*",
      destinationAddressPrefix: "*",
      destinationPortRange: "443",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsHostCommunicationInbound",
      sourceAddressPrefix: "VirtualNetwork",
      sourcePortRange: "*",
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRanges: ["8080", "5710"],
      protocol: "*",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsVmSshRdpInbound",
      sourceAddressPrefix: bastionAddressPrefix,
      sourcePortRange: "*",
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRanges: ["22", "3389"],
      protocol: "*",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
  );

  //Outbound
  rs.push(
    {
      name: "BastionAllowsSshRdpOutbound",
      sourceAddressPrefix: "*",
      sourcePortRange: "*",
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRanges: ["22", "3389"],
      protocol: "*",
      access: "Allow",
      direction: "Outbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsAzureCloudOutbound",
      sourceAddressPrefix: "*",
      sourcePortRange: "*",
      destinationAddressPrefix: "AzureCloud",
      destinationPortRange: "443",
      protocol: "Tcp",
      access: "Allow",
      direction: "Outbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsCommunicationOutbound",
      sourceAddressPrefix: "VirtualNetwork",
      sourcePortRange: "*",
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRanges: ["8080", "5710"],
      protocol: "Tcp",
      access: "Allow",
      direction: "Outbound",
      priority: startPriority++,
    },
    // {
    //   name: "BastionAllowsHttpOutbound",
    //   sourceAddressPrefix: "*",
    //   sourcePortRange: "*",
    //   destinationAddressPrefix: "Internet",
    //   destinationPortRanges: ["80", "443"],
    //   protocol: "*",
    //   access: "Allow",
    //   direction: "Outbound",
    //   priority: startPriority++,
    // },
  );
  return rs;
};
