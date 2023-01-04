import { KeyVaultInfo } from '../../types';
import Identity from '../Identity';
import { grantVaultAccessPolicy } from '../../KeyVault/VaultPermissions';
import { getIdentity } from '../Helper';
import { getGraphPermissions } from '../GraphDefinition';

export const defaultName = 'azure-devops';

interface Props {
  name?: string;
  enableOwner?: boolean;
  vaultInfo: KeyVaultInfo;
  allowAccessPolicy?: boolean
}

export const getAdoIdentity = () => getIdentity(defaultName, true);

export default async ({
  name = defaultName,
  enableOwner,
  vaultInfo,
  allowAccessPolicy,
  ...others
}: Props) => {
  const graphAccess = getGraphPermissions({ name: 'User.Read', type: 'Scope' });

  const principalRoles = enableOwner
    ? [{ roleName: 'Owner' }]
    : [
      { roleName: 'Contributor' },
      { roleName: 'Network Contributor' },
      { roleName: 'Storage Account Contributor' },
      { roleName: 'Storage Blob Data Contributor' },
      { roleName: 'Storage File Data SMB Share Contributor' },
      { roleName: 'Storage Queue Data Contributor' },
      { roleName: 'Storage Table Data Contributor' },
      { roleName: 'Log Analytics Contributor' },
      { roleName: 'Key Vault Contributor' },
      { roleName: 'Key Vault Administrator' },
      { roleName: 'User Access Administrator' },
      { roleName: 'AcrPush' },
      { roleName: 'AcrPull' },
      { roleName: 'Data Factory Contributor' },
    ];

  const ado = await Identity({
    name,
    allowImplicit: false,
    createClientSecret: true,
    createPrincipal: true,
    requiredResourceAccesses: [graphAccess],
    principalRoles,
    vaultInfo,
    ...others,
  });

  //Grant key vault permission to ADO
  if (allowAccessPolicy) {
    grantVaultAccessPolicy({
      vaultInfo,
      name: 'azure-devops-vault-permission',
      permission: 'ReadWrite',
      objectId: ado.objectId,
    });
  }

  console.log(
    `Add this principal ${name} to [User administrator, Application administrator, Cloud application administrator] of Azure AD to allow to Add/Update and Delete Groups, Users`
  );

  return ado;
};
