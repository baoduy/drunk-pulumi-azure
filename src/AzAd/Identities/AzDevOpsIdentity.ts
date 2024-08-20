import { defaultSubScope } from '../../Common';
import { KeyVaultInfo } from '../../types';
import Identity from '../Identity';
import { getGraphPermissions, roleAssignment } from '../Roles';
import { getIdentityInfoOutput } from '../Helper';

export const defaultAzAdoName = 'azure-devops';

interface Props {
  name?: string;
  vaultInfo: KeyVaultInfo;
  isSubOwner?: boolean;
}

/** Get Global  ADO Identity */
export const getAdoIdentityInfo = (vaultInfo: KeyVaultInfo) =>
  getIdentityInfoOutput({
    name: defaultAzAdoName,
    vaultInfo,
    includePrincipal: true,
  });

/** Create Global ADO Identity */
export default ({
  name = defaultAzAdoName,
  vaultInfo,
  isSubOwner,
  ...others
}: Props) => {
  const roleName = isSubOwner ? 'Owner' : 'Contributor';
  const graphAccess = getGraphPermissions({ name: 'User.Read', type: 'Scope' });

  const ado = Identity({
    name,
    appType: 'web',
    createClientSecret: true,
    createPrincipal: true,
    requiredResourceAccesses: [graphAccess],
    vaultInfo,
    ...others,
  });

  roleAssignment({
    name,
    scope: defaultSubScope,
    dependsOn: ado.instance,
    principalId: ado.principalId!,
    principalType: 'ServicePrincipal',
    roleName,
  });

  console.log(
    `Add this principal ${name} to [User administrator, Application administrator, Cloud application administrator and Global Reader] of Azure AD to allow to Add/Update and Delete Groups, Users`,
  );

  return ado;
};
