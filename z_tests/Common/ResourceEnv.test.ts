import * as common from "../../Common/ResourceEnv";
import { getResourceInfoFromId } from "../../Common/AzureEnv";
import { expect } from "chai";
import {
  getResourceGroupName,
  getSecretName,
  getStorageName,
} from "../../Common/Naming";

describe("ResourceEnv tests", () => {
  it("Get Resource Group Name", () => {
    const name = getResourceGroupName("Resource");
    expect(name).to.be.equal("stack-resource-grp-hbd");
  });

  it("Get Resource Name", () => {
    const name = common.getResourceName("KeyVault");
    expect(name).to.be.equal("stack-keyvault");
  });

  it("Get Storage Name", () => {
    const name = getStorageName("The-Main");
    expect(name).to.be.equal("stackthemainstg");
  });

  it("Get name space should be replace with hyphen", () => {
    const name = common.getResourceName("This is my Name");
    expect(name).to.be.equal("stack-this-is-my-name");
  });

  it("Get secret name the stack name shall be removed", () => {
    const name = getSecretName("test-stack-this is secret-name");
    expect(name).to.be.equal("test-this-is-secret-name");
  });

  it("Get Resource Info from Id", () => {
    const info = getResourceInfoFromId(
      "/subscriptions/1234567890/resourceGroups/sg-dev-aks-vnet/providers/Microsoft.Network/virtualNetworks/sg-dev-vnet-trans"
    );

    expect(info!.name).to.be.equal("sg-dev-vnet-trans");
    expect(info!.group.resourceGroupName).to.be.equal("sg-dev-aks-vnet");
    expect(info!.subscriptionId).to.be.equal("1234567890");
  });

  it("Prefix should not be duplicated", () => {
    const name = common.getResourceName("stack-storage-name");
    expect(name).to.be.equal("stack-storage-name");
  });

  it("Suffix should not be duplicated", () => {
    const name = common.getResourceName("storage-name", {
      suffix: "hbd",
    });
    expect(name).to.be.equal("stack-storage-name-hbd");
  });
});
