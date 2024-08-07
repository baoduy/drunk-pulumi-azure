import { getGraphPermissions } from '../AzAd/GraphDefinition';
import identityCreator from '../AzAd/Identity';
import { NamedWithVaultBasicArgs } from '../types';
import { roleAssignment } from '../AzAd/RoleAssignment';
import { defaultSubScope } from '../Common';

type Props = NamedWithVaultBasicArgs;

//** The AzAD app Identity for Azure Kubernetes for RBAC */
export default ({ name, vaultInfo, dependsOn }: Props) => {
  //AKS need this permission for AAD integration
  // const graphAccess = getGraphPermissions(
  //   { name: 'User.Read', type: 'Scope' },
  //   { name: 'Group.Read.All', type: 'Scope' },
  //   //{ name: 'Directory.Read.All', type: 'Scope' },
  //   { name: 'Directory.Read.All', type: 'Role' },
  // );

  const serverIdentity = identityCreator({
    name,
    createClientSecret: false,
    createPrincipal: true,
    //requiredResourceAccesses: [graphAccess],
    publicClient: false,
    appType: 'api',
    vaultInfo,
    dependsOn,
  });

  // roleAssignment({
  //   name: `${name}-aks-identity-acr-pull`,
  //   principalId: serverIdentity.principalId!,
  //   principalType: 'ServicePrincipal',
  //   roleName: 'AcrPull',
  //   scope: defaultSubScope,
  //   dependsOn: serverIdentity.resource,
  // });

  return serverIdentity;
};
