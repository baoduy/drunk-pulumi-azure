import identityCreator from '../AzAd/Identity';
import { BasicResourceWithVaultArgs } from '../types';
import { rsInfo } from '../Common';
import { roleAssignment } from '../AzAd';

type Props = BasicResourceWithVaultArgs;

//** The AzAD app Identity for Azure Kubernetes for RBAC */
export default ({ name, group, vaultInfo, dependsOn }: Props) => {
  const serverIdentity = identityCreator({
    name: `${name}-sso`,
    createClientSecret: false,
    createPrincipal: true,
    publicClient: false,
    appType: 'api',
    vaultInfo,
    dependsOn,
  });

  roleAssignment({
    name: `${name}-svId-rg`,
    dependsOn: serverIdentity.instance,
    principalId: serverIdentity.principalId!,
    principalType: 'ServicePrincipal',
    scope: rsInfo.getRGId(group),
    roleName: 'Reader',
  });

  return serverIdentity;
};
