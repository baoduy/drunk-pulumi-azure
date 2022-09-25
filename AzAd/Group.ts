import * as azuread from '@pulumi/azuread';

import { Input, Output } from '@pulumi/pulumi';

import { roleAssignment } from './RoleAssignment';
import { subscriptionId } from '../Common/AzureEnv';

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

export default ({ name, permissions, members, owners }: AdGroupProps) => {
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
        })
    );
  }

  if (permissions) {
    const defaultScope = subscriptionId.apply((s) => `/subscriptions/${s}`);
    permissions.map((p, i) => {
      if (!p.scope) p.scope = defaultScope;

      return roleAssignment({
        name,
        principalId: group.objectId,
        principalType: 'Group',
        roleName: p.roleName,
        scope: p.scope,
      });
    });
  }

  return group;
};

export const addUserToGroup = async (
  userName: string,
  groupObjectId: string
) => {
  const user = userName.includes('@')
    ? await azuread.getUser({ userPrincipalName: userName })
    : { objectId: userName };

  return new azuread.GroupMember(`${groupObjectId}-${userName}`, {
    groupObjectId,
    memberObjectId: user.objectId,
  });
};

export const addGroupToGroup = async (
  groupName: string,
  groupObjectId: Output<string>
) => {
  const user = await azuread.getGroup({ displayName: groupName });
  return groupObjectId.apply(
    (g) =>
      new azuread.GroupMember(`${g}-${groupName}`, {
        groupObjectId: g,
        memberObjectId: user.objectId,
      })
  );
};
