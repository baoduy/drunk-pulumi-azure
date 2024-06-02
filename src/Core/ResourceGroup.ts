import {
  DefaultResourceArgs,
  ResourceGroupInfo,
  ResourceResultProps,
  BasicResourceArgs,
} from "../types";
import {
  ResourceGroup,
  ResourceGroupArgs,
} from "@pulumi/azure-native/resources";
import ResourceCreator from "./ResourceCreator";
import { getResourceGroupName } from "../Common/Naming";
import { EnvRolesResults } from "../AzAd/EnvRoles";
import { roleAssignment } from "../AzAd/RoleAssignment";
import { currentRegionName } from "../Common/AzureEnv";
import { getRoleNames } from "../AzAd/EnvRoles.Consts";
import { replaceAll } from "../Common/Helpers";

interface Props
  extends Omit<DefaultResourceArgs, "monitoring">,
    Omit<BasicResourceArgs, "group"> {
  formattedName?: boolean;
  location?: string;
  /** Grant permission of this group into Environment Roles groups*/
  permissions?: {
    envRoles: EnvRolesResults;
    enableRGRoles?: boolean;
    enableAksRoles?: boolean;
    enableIotRoles?: boolean;
    enableVaultRoles?: boolean;
  };
}

export default ({
  name,
  formattedName,
  permissions,
  ...others
}: Props): ResourceResultProps<ResourceGroup> & {
  toGroupInfo: () => ResourceGroupInfo;
} => {
  name = formattedName ? name : getResourceGroupName(name);

  const { resource, locker, diagnostic } = ResourceCreator(ResourceGroup, {
    resourceGroupName: name,
    ...others,
  } as ResourceGroupArgs & DefaultResourceArgs);

  if (permissions) {
    const roles = getRoleNames(permissions);

    //ReadOnly
    roles.readOnly.forEach((r) => {
      const n = `${name}-readonly-${replaceAll(r, " ", "")}`;
      roleAssignment({
        name: n,
        principalId: permissions.envRoles.readOnly.objectId,
        principalType: "Group",
        roleName: "Contributor",
        scope: resource.id,
      });
    });

    //Contributors
    roles.contributor.forEach((r) => {
      const n = `${name}-contributor-${replaceAll(r, " ", "")}`;
      roleAssignment({
        name: n,
        principalId: permissions.envRoles.contributor.objectId,
        principalType: "Group",
        roleName: "Contributor",
        scope: resource.id,
      });
    });

    //Admin
    roles.admin.forEach((r) => {
      const n = `${name}-admin-${replaceAll(r, " ", "")}`;
      roleAssignment({
        name: n,
        principalId: permissions.envRoles.admin.objectId,
        principalType: "Group",
        roleName: "Contributor",
        scope: resource.id,
      });
    });
  }

  return {
    name,
    resource: resource as ResourceGroup,
    locker,
    diagnostic,
    toGroupInfo: () => ({
      resourceGroupName: name,
      location: currentRegionName,
    }),
  };
};
