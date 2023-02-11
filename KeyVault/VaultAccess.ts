import { PermissionProps } from "./VaultPermissions";
import GroupRole from "../AzAd/Role";
import { currentEnv, currentServicePrincipal } from "../Common/AzureEnv";
import { getAdGroup } from "../AzAd/Group";
import { envRoleNames } from "../AzAd/EnvRoles";
import * as azuread from "@pulumi/azuread";

export type VaultAccessType = {
  useEnvRoles?: boolean;
  enableRbac?: boolean;
  permissions?: Array<PermissionProps>;
};

interface Props {
  name: string;
  auth: VaultAccessType;
}

export default async ({ name, auth }: Props) => {
  //Permission Groups
  const readOnlyGroup = auth.useEnvRoles
    ? await getAdGroup(envRoleNames.readOnly)
    : await GroupRole({
        env: currentEnv,
        appName: `${name}-vault`,
        roleName: "ReadOnly",
      });
  const adminGroup = auth.useEnvRoles
    ? await getAdGroup(envRoleNames.contributor)
    : await GroupRole({
        env: currentEnv,
        appName: `${name}-vault`,
        roleName: "Admin",
      });

  //Add current service principal in
  if (auth!.permissions!.length <= 0) {
    auth.permissions!.push({
      objectId: currentServicePrincipal,
      permission: "ReadWrite",
    });
  }

  //Add Permission to Groups
  auth.permissions!.forEach(
    ({ objectId, applicationId, permission }, index) =>
      new azuread.GroupMember(`${name}-${permission}-${index}`, {
        groupObjectId:
          permission === "ReadOnly"
            ? readOnlyGroup.objectId
            : adminGroup.objectId,
        memberObjectId: objectId ?? applicationId,
      })
  );

  return { readOnlyGroup, adminGroup };
};
