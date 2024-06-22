import { BasicResourceArgs, IdentityRoleAssignment } from "../types";
import * as azure from "@pulumi/azure-native";
import { getManagedIdentityName } from "../Common/Naming";
import Locker from "../Core/Locker";
import { grantIdentityPermissions } from "./Helper";

interface Props extends BasicResourceArgs, IdentityRoleAssignment {}

export default ({
  name,
  group,
  roles,
  envRole,
  vaultInfo,
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

  grantIdentityPermissions({
    name,
    envRole,
    roles,
    vaultInfo,
    principalId: managedIdentity.principalId,
  });

  return managedIdentity;
};
