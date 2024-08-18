import { BasicEncryptResourceArgs, ResourceInfoWithInstance } from '../types';
import * as automation from '@pulumi/azure-native/automation';
import { naming } from '../Common';
import { addEncryptKey } from '../KeyVault/Helper';
import UserAssignedIdentity from '../AzAd/UserAssignedIdentity';

interface Props extends BasicEncryptResourceArgs {}

export default ({
  name,
  group,
  enableEncryption,
  vaultInfo,
  envRoles,
  dependsOn,
  ignoreChanges,
}: Props): ResourceInfoWithInstance<automation.AutomationAccount> => {
  name = naming.getAutomationAccountName(name);

  const identity = UserAssignedIdentity({
    name,
    group,
    dependsOn,
  });
  //grant permission
  envRoles?.addMember('contributor', identity.principalId);

  const encryption =
    enableEncryption && vaultInfo ? addEncryptKey(name, vaultInfo) : undefined;

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
          ? { userAssignedIdentity: identity.id }
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
  //grant permission
  envRoles?.addIdentity('contributor', auto.identity);

  return {
    name,
    group,
    id: auto.id,
    instance: auto,
  };
};
