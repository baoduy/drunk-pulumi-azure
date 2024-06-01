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

  return new automation.AutomationAccount(name, {
    automationAccountName: name,
    ...group,

    publicNetworkAccess: false,
    identity: { type: "SystemAssigned" },
    disableLocalAuth: true,

    encryption: encryption
      ? {
          keySource: "Microsoft.Keyvault",
          keyVaultProperties: encryption.keyVaultProperties,
        }
      : undefined,
    sku: {
      name: "Free", //Free, Basic
    },
  });
};
