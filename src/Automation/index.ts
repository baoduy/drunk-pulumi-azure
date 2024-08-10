import {
  BasicEncryptResourceArgs,
  ResourceInfoWithInstance,
  WithDependsOn,
} from '../types';
import * as automation from '@pulumi/azure-native/automation';
import { defaultSubScope, getAutomationAccountName } from '../Common';
import { addEncryptKey } from '../KeyVault/Helper';
import UserAssignedIdentity from '../AzAd/UserAssignedIdentity';
import { roleAssignment } from '../AzAd/RoleAssignment';
import { Input } from '@pulumi/pulumi';

interface Props extends BasicEncryptResourceArgs {}

export default ({
  name,
  group,
  enableEncryption,
  vaultInfo,
  dependsOn,
  ignoreChanges,
}: Props): ResourceInfoWithInstance<automation.AutomationAccount> => {
  name = getAutomationAccountName(name);

  const grantPermission = ({
    name,
    principalId,
    dependsOn,
  }: {
    name: string;
    principalId: Input<string>;
  } & WithDependsOn) =>
    roleAssignment({
      name,
      dependsOn,
      principalId,
      principalType: 'ServicePrincipal',
      roleName: 'Contributor',
      scope: defaultSubScope,
    });

  const identity = UserAssignedIdentity({
    name,
    group,
    dependsOn,
  });
  //Grant permission as contributor of subscription
  grantPermission({
    name: `${name}-UID`,
    dependsOn: identity.instance,
    principalId: identity.principalId,
  });

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

  auto.identity.apply((id) =>
    grantPermission({
      name: `${name}-identity`,
      dependsOn: auto,
      principalId: id!.principalId,
    }),
  );

  return {
    name,
    group,
    id: auto.id,
    instance: auto,
  };
};
