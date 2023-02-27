import { PermissionProps } from './VaultPermissions';
import GroupRole from '../AzAd/Role';
import { currentEnv, currentServicePrincipal } from '../Common/AzureEnv';
import { getAdGroup } from '../AzAd/Group';
import { EnvRoleNamesType } from '../AzAd/EnvRoles';
import * as azuread from '@pulumi/azuread';

export type VaultAccessType = {
  /** Grant permission of this group into Environment Roles groups*/
  envRoleNames?: EnvRoleNamesType;
  permissions?: Array<PermissionProps>;
};

interface Props {
  name: string;
  auth: VaultAccessType;
}

export default async ({ name, auth }: Props) => {
  //Permission Groups
  const readOnlyGroup = auth.envRoleNames
    ? await getAdGroup(auth.envRoleNames.readOnly)
    : await GroupRole({
        env: currentEnv,
        appName: `${name}-vault`,
        roleName: 'ReadOnly',
      });
  const adminGroup = auth.envRoleNames
    ? await getAdGroup(auth.envRoleNames.contributor)
    : await GroupRole({
        env: currentEnv,
        appName: `${name}-vault`,
        roleName: 'Admin',
      });

  //Add current service principal in
  if (auth.permissions == undefined) {
    auth.permissions = [
      {
        objectId: currentServicePrincipal,
        permission: 'ReadWrite',
      },
    ];
  } else
    auth.permissions.push({
      objectId: currentServicePrincipal,
      permission: 'ReadWrite',
    });

  //Add Permission to Groups
  auth.permissions.forEach(
    ({ objectId, applicationId, permission }, index) =>
      new azuread.GroupMember(`${name}-${permission}-${index}`, {
        groupObjectId:
          permission === 'ReadOnly'
            ? readOnlyGroup.objectId
            : adminGroup.objectId,
        memberObjectId: objectId ?? applicationId,
      })
  );

  return { readOnlyGroup, adminGroup };
};
