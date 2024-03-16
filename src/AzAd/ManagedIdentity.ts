import { BasicResourceArgs } from "../types";
import * as azure from "@pulumi/azure-native";
import { getManagedIdentityName } from "../Common/Naming";
import { defaultTags } from "../Common/AzureEnv";
import Locker from "../Core/Locker";

interface Props extends BasicResourceArgs {
  lock?: boolean;
}

export default ({ name, group, lock }: Props) => {
  const n = getManagedIdentityName(name);
  const managedIdentity = new azure.managedidentity.UserAssignedIdentity(n, {
    resourceName: n,
    ...group,
    tags: defaultTags,
  });

  if (lock) {
    Locker({
      name: n,
      resourceId: managedIdentity.id,
      dependsOn: managedIdentity,
    });
  }

  return managedIdentity;
};
