import vaultCreator from "../../KeyVault";
import "../_tools/Mocks";
import { expect } from "chai";

describe("Key Vault Creator tests", () => {
  it("Vault Creator", async () => {
    const group = { resourceGroupName: "RG" };

    const rs = await vaultCreator({
      name: "root",
      group,
    });

    expect(rs.name).to.equal("stack-root-vlt");
    expect(rs.toVaultInfo().group).to.equal(group);

    rs.vault.urn.apply((n) => expect(n).to.include("stack-root-vlt"));
  }).timeout(5000);

  it("Vault Creator with custom prefix", async () => {
    const group = { resourceGroupName: "RG" };

    const rs = await vaultCreator({
      name: "root",
      nameConvention: { prefix: "steven", suffix: "vlt" },
      group,
    });

    expect(rs.name).to.equal("steven-root-vlt");
    expect(rs.toVaultInfo().group).to.equal(group);

    rs.vault.urn.apply((n) => expect(n).to.include("steven-root-vlt"));
  }).timeout(5000);
});
