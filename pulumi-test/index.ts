import * as pulumi from "@pulumi/pulumi";
import { authorization } from "@pulumi/azure-native";
import RG from "@drunk-pulumi/azure/Core/ResourceGroup";
import Vault from "@drunk-pulumi/azure/KeyVault";
import MySql from "@drunk-pulumi/azure/MySql";
import { VnetBuilder } from "@drunk-pulumi/azure/Builder/VnetBuilder";
import AksFirewallPolicy from "../src/VNet/FirewallPolicies/AksFirewallPolicy";

const rs = (async () => {
  const suffix = "codedx";
  const group = RG({
    name: `sql-${suffix}`,
  }).toGroupInfo();

  const vault = Vault({
    name: suffix,
    group,
  }).toVaultInfo();

  new VnetBuilder({
    name: "sg-hub",
    group,
    vaultInfo: vault,
    subnets: { aks: { addressPrefix: "192.168.2.0/24" } },
  })
    .withBastion({ subnet: { addressPrefix: "192.168.10.0/24" } })
    .withFirewall({
      subnet: {
        addressPrefix: "192.168.3.0/24",
        managementAddressPrefix: "192.168.4.0/24",
      },
      policy: {
        rules: [
          AksFirewallPolicy({
            vnetAddressSpace: ["192.168.2.0/24"],
            privateCluster: true,
          }),
        ],
      },
      sku: { name: "AZFW_Hub", tier: "Basic" },
    })
    .build();
  return group;
})();

export default pulumi.output(rs);
