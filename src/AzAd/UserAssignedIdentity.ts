import { BasicResourceArgs } from "../types";
import * as azure from "@pulumi/azure-native";
import { getManagedIdentityName } from "../Common/Naming";
import Locker from "../Core/Locker";
import { roleAssignment } from "./RoleAssignment";
import { Input } from "@pulumi/pulumi";

interface Props extends BasicResourceArgs {
  lock?: boolean;
  roles?: Array<{ name: string; scope: Input<string> }>;
}

export default ({
  name,
  group,
  lock,
  roles,
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

  if (roles) {
    roles.map((r) =>
      roleAssignment({
        name,
        roleName: r.name,
        principalId: managedIdentity!.principalId,
        principalType: "ServicePrincipal",
        scope: r.scope,
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
