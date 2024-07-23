import { defaultSubScope } from '../../Common/AzureEnv';
import * as authorization from '@pulumi/azure-native/authorization';

export default () =>
  new authorization.RoleDefinition('Just_In_Time_Request_Role', {
    roleName: 'Just In Time Request Role',
    description: 'Just In Time Request Role',
    permissions: [
      {
        actions: [
          'Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action',
          'Microsoft.Security/locations/jitNetworkAccessPolicies/read',
          'Microsoft.Security/policies/read',
          'Microsoft.Compute/virtualMachines/read',
        ],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
    ],
    assignableScopes: [defaultSubScope],
    scope: defaultSubScope,
  });
