import * as pulumi from "@pulumi/pulumi";
import { authorization } from "@pulumi/azure-native";
import RG from "@drunk-pulumi/azure/Core/ResourceGroup";
import Vault from "@drunk-pulumi/azure/KeyVault";
import MySql from "@drunk-pulumi/azure/MySql";

const rs = (async () => {
  const group = RG({
    name: "sql-code",
  }).toGroupInfo();

  const vault = Vault({
    name: "code",
    group,
  }).toVaultInfo();

  // const sqlServer = MySql({
  //   name: "sql-server-code",
  //   group,
  //   vaultInfo: vault,
  //   enableEncryption: true,
  //   auth: {
  //     azureAdOnlyAuthentication: true,
  //     adminLogin: "sql-admin",
  //     password: "L^]Ka>d]ddzrzUTi8t98",
  //   },
  //   databases: [{ name: "db-code-01", sku: "Basic" }],
  // });

  return group;
})();

export default pulumi.output(rs);
