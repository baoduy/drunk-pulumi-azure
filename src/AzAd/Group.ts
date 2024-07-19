import * as azuread from '@pulumi/azuread';
import { Input, Output, output } from '@pulumi/pulumi';
import { defaultSubScope } from '../Common';
import { roleAssignment } from './RoleAssignment';
import { isDryRun } from '../Common';
import { GetGroupResult } from '@pulumi/azuread/getGroup';

export interface GroupPermissionProps {
  /** The name of the roles would like to assign to this group*/
  roleName: string;
  /**The scopes pf role if not provided the scope will be subscription level*/
  scope?: Input<string>;
}

interface AdGroupProps {
  name: string;
  //The ObjectId of Users.
  members?: Input<string>[];
  owners?: Input<Input<string>[]>;
  permissions?: Array<GroupPermissionProps>;
}

export default async ({ name, permissions, members, owners }: AdGroupProps) => {
  const group = new azuread.Group(name, {
    displayName: name,
    externalSendersAllowed: false,
    //hideFromAddressLists: true,
    //hideFromOutlookClients: true,
    mailEnabled: false,
    securityEnabled: true,
    owners,
  });

  if (members) {
    members.map(
      (u, i) =>
        new azuread.GroupMember(`${name}-member-${i}`, {
          groupObjectId: group.id,
          memberObjectId: u,
        }),
    );
  }

  if (permissions) {
    await Promise.all(
      permissions.map((p) =>
        roleAssignment({
          name,
          principalId: group.objectId,
          principalType: 'Group',
          roleName: p.roleName,
          scope: p.scope || defaultSubScope,
        }),
      ),
    );
  }

  return group;
};

export const getAdGroup = (displayName: string) => {
  if (isDryRun)
    return output({
      displayName,
      objectId: '00000000-0000-0000-0000-000000000000',
    } as GetGroupResult);
  return output(azuread.getGroup({ displayName }));
};

export const addMemberToGroup = ({
  name,
  userName,
  objectId,
  groupObjectId,
}: {
  name: string;
  userName?: string;
  objectId?: Input<string>;
  groupObjectId: Input<string>;
}) => {
  if (userName && !userName.includes('@'))
    throw new Error('UserName must include suffix @domain.name');
  else if (!objectId)
    throw new Error('Either UserName or ObjectId must be defined.');

  const user = userName
    ? output(azuread.getUser({ userPrincipalName: userName }))
    : { objectId: objectId };

  return new azuread.GroupMember(name, {
    groupObjectId,
    memberObjectId: user.objectId,
  });
};

export const addGroupToGroup = (
  groupMemberName: string,
  groupObjectId: Output<string>,
) => {
  const group = getAdGroup(groupMemberName);

  return groupObjectId.apply(
    (g) =>
      new azuread.GroupMember(`${g}-${groupMemberName}`, {
        groupObjectId: g,
        memberObjectId: group.objectId,
      }),
  );
};

export const assignRolesToGroup = ({
  roles,
  groupName,
  scope,
}: {
  groupName: string;
  roles: Array<string>;
  scope?: Input<string>;
}) =>
  output(async () => {
    const group = getAdGroup(groupName);
    return await Promise.all(
      roles.map((p) =>
        roleAssignment({
          name: groupName,
          principalId: group.objectId,
          principalType: 'Group',
          roleName: p,
          scope: scope ?? defaultSubScope,
        }),
      ),
    );
  });
