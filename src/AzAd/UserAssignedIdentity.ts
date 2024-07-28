import { addCustomSecrets } from '../KeyVault/CustomHelper';
import { BasicResourceArgs, IdentityRoleAssignment } from '../types';
import * as azure from '@pulumi/azure-native';
import { getManagedIdentityName } from '../Common';
import { grantIdentityPermissions } from './Helper';

export interface UserAssignedIdentityProps
  extends BasicResourceArgs,
    IdentityRoleAssignment {}

export default ({
  name,
  group,
  vaultInfo,
  dependsOn,
  importUri,
  ignoreChanges,
  ...others
}: UserAssignedIdentityProps) => {
  name = getManagedIdentityName(name);
  const managedIdentity = new azure.managedidentity.UserAssignedIdentity(
    name,
    {
      resourceName: name,
      ...group,
    },
    { dependsOn, import: importUri, ignoreChanges },
  );

  grantIdentityPermissions({
    ...others,
    name,
    vaultInfo,
    principalId: managedIdentity.principalId,
  });

  if (vaultInfo) {
    addCustomSecrets({
      vaultInfo,
      dependsOn: managedIdentity,
      contentType: 'UserAssignedIdentity',
      formattedName: true,
      items: [
        {
          name: `${name}-id`,
          value: managedIdentity.id,
        },
        {
          name: `${name}-principalId`,
          value: managedIdentity.principalId,
        },
      ],
    });
  }
  return managedIdentity;
};
