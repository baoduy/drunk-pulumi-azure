import { addCustomSecrets } from '../KeyVault/CustomHelper';
import {
  BasicResourceArgs,
  IdentityInfoWithInstance,
  IdentityRoleAssignment,
} from '../types';
import * as mid from '@pulumi/azure-native/managedidentity';
import { getUIDName } from '../Common';
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
}: UserAssignedIdentityProps): IdentityInfoWithInstance<mid.UserAssignedIdentity> => {
  name = getUIDName(name);
  const managedIdentity = new mid.UserAssignedIdentity(
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

  return {
    //name,
    //group,
    id: managedIdentity.id,
    principalId: managedIdentity.principalId,
    instance: managedIdentity,
  };
};
