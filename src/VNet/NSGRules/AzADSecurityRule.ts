import { CustomSecurityRuleArgs } from "../../types";

interface Props {
  startPriority: number;
}

export default ({ startPriority = 300 }: Props) => {
  const rs = new Array<CustomSecurityRuleArgs>();
  //Allows RD
  rs.push(
    {
      name: "AllowRD",
      sourceAddressPrefix: "CorpNetSaw",
      sourcePortRange: "*",
      destinationAddressPrefix: "*",
      destinationPortRange: "3389",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "AllowPSRemove",
      sourceAddressPrefix: "AzureActiveDirectoryDomainServices",
      sourcePortRange: "*",
      destinationAddressPrefix: "*",
      destinationPortRange: "5986",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
    {
      name: "AllowPort636",
      sourceAddressPrefix: "*",
      sourcePortRange: "*",
      destinationAddressPrefix: "*",
      destinationPortRange: "636",
      protocol: "Tcp",
      access: "Allow",
      direction: "Inbound",
      priority: startPriority++,
    },
  );
  return rs;
};
