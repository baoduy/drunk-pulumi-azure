import { BasicResourceArgs } from "../types";
import * as azure from "@pulumi/azure-native";
import { getManagedIdentityName } from "../Common/Naming";
import Locker from "../Core/Locker";
import { roleAssignment } from "./RoleAssignment";
import { defaultScope } from "../Common/AzureEnv";

interface Props extends BasicResourceArgs {
  lock?: boolean;
  permissions?: Array<{ roleName: string }>;
}

export default ({
  name,
  group,
  lock,
  permissions,
  dependsOn,
  importUri,
  ignoreChanges,
}: Props) => {
  name = getManagedIdentityName(name);
  const managedIdentity = new azure.managedidentity.UserAssignedIdentity(
    name,
    {
      resourceName: name,
      ...group,
    },
    { dependsOn, import: importUri, ignoreChanges },
  );

  if (permissions) {
    permissions.map((r) =>
      roleAssignment({
        name,
        roleName: r.roleName,
        principalId: managedIdentity!.id,
        principalType: "ServicePrincipal",
        scope: defaultScope,
      }),
    );
  }

  if (lock) {
    Locker({
      name,
      resource: managedIdentity,
    });
  }

  return managedIdentity;
};
