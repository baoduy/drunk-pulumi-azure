import * as azuread from '@pulumi/azuread';
import { Input, output } from '@pulumi/pulumi';
import { defaultSubScope } from '../Common';
import { WithNamedType } from '../types';
import { roleAssignment } from './Roles';

export interface GroupPermissionProps {
  /** The name of the roles would like to assign to this group*/
  roleName: string;
  /**The scopes pf role if not provided the scope will be subscription level*/
  scope?: Input<string>;
}

interface AdGroupProps extends WithNamedType {
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

export const addMemberToGroup = ({
  name,
  objectId,
  groupObjectId,
}: WithNamedType & {
  objectId: Input<string>;
  groupObjectId: Input<string>;
}) =>
  output([objectId, groupObjectId]).apply(
    ([oId, gId]) =>
      new azuread.GroupMember(`${name}-${gId}-${oId}`, {
        groupObjectId: gId,
        memberObjectId: oId,
      }),
  );
