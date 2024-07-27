import { BasicResourceWithVaultArgs } from '../types';
import * as automation from '@pulumi/azure-native/automation';
import { getAutomationAccountName } from '../Common';
import { getEncryptionKeyOutput } from '../KeyVault/Helper';
import UserAssignedIdentity from '../AzAd/UserAssignedIdentity';
import { defaultSubScope } from '../Common';
import { grantIdentityPermissions } from '../AzAd/Helper';

interface Props extends BasicResourceWithVaultArgs {
  enableEncryption?: boolean;
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

  const encryption =
    enableEncryption && vaultInfo
      ? getEncryptionKeyOutput({ name, vaultInfo })
      : undefined;

  const roles = [{ name: 'Contributor', scope: defaultSubScope }];
  const identity = UserAssignedIdentity({
    name,
    group,
    roles,
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
        type: automation.ResourceIdentityType.SystemAssigned_UserAssigned,
        userAssignedIdentities: [identity.id],
      },
      disableLocalAuth: true,

      encryption: {
        keySource: encryption ? 'Microsoft.Keyvault' : 'Microsoft.Automation',
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
        name: 'Basic',
      },
    },
    { dependsOn: identity, ignoreChanges },
  );

  auto.identity.apply((i) =>
    grantIdentityPermissions({
      name,
      roles,
      principalId: i!.principalId,
    }),
  );

  return auto;
};
