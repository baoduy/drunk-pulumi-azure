import { BasicResourceArgs, KeyVaultInfo } from "../types";
import * as automation from "@pulumi/azure-native/automation";
import { getAutomationAccountName } from "../Common/Naming";
import { getEncryptionKeyOutput } from "../KeyVault/Helper";

interface Props extends BasicResourceArgs {
  enableEncryption?: boolean;
  vaultInfo: KeyVaultInfo;
}

export default ({ name, group, enableEncryption, vaultInfo }: Props) => {
  name = getAutomationAccountName(name);

  const encryption = enableEncryption
    ? getEncryptionKeyOutput(name, vaultInfo)
    : undefined;

  const auto = new automation.AutomationAccount(name, {
    automationAccountName: name,
    ...group,

    publicNetworkAccess: false,
    identity: { type: "SystemAssigned" },
    disableLocalAuth: true,

    encryption: {
      keySource: encryption ? "Microsoft.Keyvault" : "Microsoft.Automation",
      //TODO: create userAssignedIdentity here
      identity: encryption ? { userAssignedIdentity: undefined } : undefined,
      keyVaultProperties: encryption
        ? {
            keyName: encryption.apply((s) => s.keyName),
            keyvaultUri: encryption.apply((s) => s.keyVaultUri),
            keyVersion: encryption.apply((s) => s.keyVersion!),
          }
        : undefined,
    },
    sku: {
      name: "Basic",
    },
  });

  // new automation.RuntimeEnvironment(name, {
  //   runtimeEnvironmentName: name,
  //   automationAccountName: auto.name,
  //   ...group,
  //   defaultPackages: {},
  // });
  return auto;
};
