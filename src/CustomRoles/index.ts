import { defaultScope } from '../Common/AzureEnv';
import * as authorization from '@pulumi/azure-native/authorization';
interface Props {
  enableJustInTimeRemoteRole?: boolean;
}

export default ({ enableJustInTimeRemoteRole = true }: Props) => {
  if (enableJustInTimeRemoteRole) {
    new authorization.RoleDefinition('JustInTime-User-Remote-Request', {
      roleName: 'Just-In-Time-User-Remote-Request-Role',
      description: 'Just-in-time virtual machine user remote request role',
      scope: defaultScope,
      permissions: [
        {
          actions: [
            'Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action',
            'Microsoft.Security/locations/jitNetworkAccessPolicies/*/read',
            'Microsoft.Security/policies/read',
            'Microsoft.Compute/virtualMachines/read',
            'Microsoft.Network/networkInterfaces/*/read',
          ],
          notActions: [],
        },
      ],
      assignableScopes: [defaultScope],
    });
  }
};
