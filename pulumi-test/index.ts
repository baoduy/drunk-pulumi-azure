import * as pulumi from "@pulumi/pulumi";
import { authorization } from "@pulumi/azure-native";
import RG from "@drunk-pulumi/azure/Core/ResourceGroup";
import Vault from "@drunk-pulumi/azure/KeyVault";
import MySql from "@drunk-pulumi/azure/MySql";

const rs = (async () => {
  const suffix = 'codedx'
  const group = RG({
    name: `sql-${suffix}`,
  }).toGroupInfo();

  const vault = Vault({
    name: suffix,
    group,
  }).toVaultInfo();

  const sqlServer = MySql({
    name: suffix,
    group,
    vaultInfo: vault,
    enableEncryption: true,
    auth: {
      enableAdAdministrator: true,
      password: "L^]Ka>d]ddzrzUTi8t98",
    },
  });

  return group;
})();

export default pulumi.output(rs);
