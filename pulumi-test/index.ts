import * as pulumi from "@pulumi/pulumi";
import { authorization } from "@pulumi/azure-native";
import RG from "@drunk-pulumi/azure/Core/ResourceGroup";
import Vault from "@drunk-pulumi/azure/KeyVault";
import SqlServer from "@drunk-pulumi/azure/Sql";

const rs = (async () => {
  const group = RG({
    name: "sql-code",
  }).toGroupInfo();

  // const vault = Vault({
  //   name: "vault-code",
  //   group,
  // }).toVaultInfo();
  //
  // const sqlServer = SqlServer({
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
