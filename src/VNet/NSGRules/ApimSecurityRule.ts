import { CustomSecurityRuleArgs } from "../types";
import { currentRegionCode } from "../../Common/AzureEnv";

interface Props {
  startPriority?: number;
}
/** The Security group rules for Bastion */
// https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
export default ({ startPriority = 310 }: Props = {}) => {
  const rs = new Array<CustomSecurityRuleArgs>();
  //Inbound
  rs.push(
    {
      name: "allow_apim_out_storage",
      description: "Allow APIM out to Storage",
      priority: startPriority++,
      protocol: "Tcp",
      access: "Allow",
      direction: "Outbound",

      sourceAddressPrefix: "*",
      sourcePortRange: "*",
      destinationAddressPrefix: `Storage.${currentRegionCode}`,
      destinationPortRanges: ["443"],
    },
    {
      name: "allow_apim_out_keyvault",
      description: "Allow APIM out to Key Vault",
      priority: startPriority++,
      protocol: "Tcp",
      access: "Allow",
      direction: "Outbound",

      sourceAddressPrefix: "*",
      sourcePortRange: "*",
      destinationAddressPrefix: `AzureKeyVault.${currentRegionCode}`,
      destinationPortRanges: ["443"],
    },
  );

  return rs;
};
