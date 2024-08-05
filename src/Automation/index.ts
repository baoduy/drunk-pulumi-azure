import {
  BasicEncryptResourceArgs,
  BasicResourceWithVaultArgs,
  ResourceInfoWithInstance,
} from '../types';
import * as automation from '@pulumi/azure-native/automation';
import { getAutomationAccountName } from '../Common';
import { addEncryptKey } from '../KeyVault/Helper';
import UserAssignedIdentity from '../AzAd/UserAssignedIdentity';

interface Props extends BasicEncryptResourceArgs {}

export default ({
  name,
  group,
  enableEncryption,
  envRoles,
  vaultInfo,
  dependsOn,
  ignoreChanges,
}: Props): ResourceInfoWithInstance<automation.AutomationAccount> => {
  name = getAutomationAccountName(name);

  const identity = UserAssignedIdentity({
    name,
    group,
    dependsOn,
  });
  envRoles?.addMember('readOnly', identity.principalId);

  const encryption =
    enableEncryption && vaultInfo
      ? addEncryptKey({ name, vaultInfo })
      : undefined;

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
              keyName: encryption.keyName,
              keyvaultUri: encryption.keyVaultUri,
              keyVersion: encryption.keyVersion,
            }
          : undefined,
      },
      sku: {
        name: 'Basic',
      },
    },
    { dependsOn: identity.instance, ignoreChanges },
  );

  return {
    name,
    group,
    id: auto.id,
    instance: auto,
  };
};
