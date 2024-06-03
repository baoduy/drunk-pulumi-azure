import { BasicResourceArgs, KeyVaultInfo } from "../types";
import * as automation from "@pulumi/azure-native/automation";
import { getAutomationAccountName } from "../Common/Naming";
import { getEncryptionKeyOutput } from "../KeyVault/Helper";
import UserAssignedIdentity from "../AzAd/UserAssignedIdentity";
import { defaultScope } from "../Common/AzureEnv";

interface Props extends BasicResourceArgs {
  enableEncryption?: boolean;
  vaultInfo: KeyVaultInfo;
}

export default ({
  name,
  group,
  enableEncryption,
  vaultInfo,
  dependsOn,
  ignoreChanges,
}: Props) => {
  name = getAutomationAccountName(name);

  const encryption = enableEncryption
    ? getEncryptionKeyOutput(name, vaultInfo)
    : undefined;

  const identity = UserAssignedIdentity({
    name,
    group,
    roles: [{ name: "Contributor", scope: defaultScope }],
    dependsOn,
  });
  //TODO: Add this identity into a vault reader role.

  const auto = new automation.AutomationAccount(
    name,
    {
      automationAccountName: name,
      ...group,

      publicNetworkAccess: false,
      identity: {
        type: automation.ResourceIdentityType.UserAssigned,
        userAssignedIdentities: [identity.id],
      },
      disableLocalAuth: true,

      encryption: {
        keySource: encryption ? "Microsoft.Keyvault" : "Microsoft.Automation",
        identity: encryption
          ? { userAssignedIdentity: [identity.id] }
          : undefined,
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
    },
    { dependsOn: identity, ignoreChanges },
  );

  // new automation.RuntimeEnvironment(name, {
  //   runtimeEnvironmentName: name,
  //   automationAccountName: auto.name,
  //   ...group,
  //   defaultPackages: {},
  // });
  return auto;
};
