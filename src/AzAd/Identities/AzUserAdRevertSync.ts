//This will create a App Registration with enough permission for Application to read users from Azure AD and sync back to AD DS on-premise.
import { KeyVaultInfo, WithNamedType } from '../../types';
import Identity from '../Identity';
import { getGraphPermissions } from '../Roles';

interface Props extends WithNamedType {
  vaultInfo: KeyVaultInfo;
}

export default ({ name, ...others }: Props) => {
  const graphAccess = getGraphPermissions(
    { name: 'User.Read.All', type: 'Role' },
    { name: 'Group.Read.All', type: 'Role' },
  );

  return Identity({
    name,
    appType: 'api',
    createClientSecret: true,
    createPrincipal: true,
    requiredResourceAccesses: [graphAccess],
    ...others,
  });
};
