import { CustomSecurityRuleArgs } from "../types";

interface Props {
  addressPrefix: string;
  version: "v1" | "v2";
  startPriority?: number;
}

/** The Security group rules for Bastion */
// https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
export default ({ addressPrefix, version, startPriority = 300 }: Props) => {
  const rs = new Array<CustomSecurityRuleArgs>();
  //Inbound
  rs.push(
    {
      name: "allow_internet_in_gateway_health",
      description: "Allow Health check access from internet to Gateway",
      priority: startPriority++,
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",

      sourceAddressPrefix: "Internet",
      sourcePortRange: "*",
      destinationAddressPrefix: addressPrefix,
      destinationPortRanges:
        version === "v1" ? ["65503-65534"] : ["65200-65535"],
    },
    {
      name: "allow_https_internet_in_gateway",
      description: "Allow HTTPS access from internet to Gateway",
      priority: startPriority++,
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",

      sourceAddressPrefix: "Internet",
      sourcePortRange: "*",
      destinationAddressPrefix: addressPrefix,
      destinationPortRange: "443",
    },
    {
      name: "allow_loadbalancer_in_gateway",
      description: "Allow Load balancer to Gateway",
      priority: startPriority++,
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",

      sourceAddressPrefix: "AzureLoadBalancer",
      sourcePortRange: "*",
      destinationAddressPrefix: addressPrefix,
      destinationPortRange: "*",
    },
  );

  //Outbound
  //rs.push();
  return rs;
};
