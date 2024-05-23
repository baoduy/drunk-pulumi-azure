import { CustomSecurityRuleArgs } from "../../types";

interface Props {
  startPriority: number;
}

/** The Security group rules for Bastion */
// https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
export default ({ startPriority = 200 }: Props) => {
  const rs = new Array<CustomSecurityRuleArgs>();
  //Inbound
  rs.push(
    {
      name: "BastionAllowsHttpsInbound",
      sourceAddressPrefix: "Internet",
      sourcePortRange: "443",
      destinationAddressPrefix: "*",
      destinationPortRange: "*",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsGatewayManagerInbound",
      sourceAddressPrefix: "GatewayManager",
      sourcePortRange: "443",
      destinationAddressPrefix: "*",
      destinationPortRange: "*",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsAzureBalancerInbound",
      sourceAddressPrefix: "AzureLoadBalancer",
      sourcePortRange: "443",
      destinationAddressPrefix: "*",
      destinationPortRange: "*",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsHostCommunicationInbound",
      sourceAddressPrefix: "VirtualNetwork",
      sourcePortRanges: ["8080", "5710"],
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRange: "*",
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
      sourcePortRanges: ["22", "3389"],
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRange: "*",
      protocol: "*",
      access: "Allow",
      direction: "Outbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsAzureCloudOutbound",
      sourceAddressPrefix: "*",
      sourcePortRange: "443",
      destinationAddressPrefix: "AzureCloud",
      destinationPortRange: "*",
      protocol: "Tcp",
      access: "Allow",
      direction: "Outbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsCommunicationOutbound",
      sourceAddressPrefix: "VirtualNetwork",
      sourcePortRanges: ["8080", "5710"],
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRange: "*",
      protocol: "Tcp",
      access: "Allow",
      direction: "Outbound",
      priority: startPriority++,
    },
    {
      name: "BastionAllowsHttpOutbound",
      sourceAddressPrefix: "*",
      sourcePortRange: "80",
      destinationAddressPrefix: "Internet",
      destinationPortRange: "*",
      protocol: "*",
      access: "Allow",
      direction: "Outbound",
      priority: startPriority++,
    },
  );
  return rs;
};
