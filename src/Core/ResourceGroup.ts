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
import { currentRegionName } from "../Common/AzureEnv";
import { grantEnvRolesAccess } from "../AzAd/EnvRoles.Consts";

export type RGPermissionType = {
  envRoles: EnvRolesResults;
  enableRGRoles?: boolean;
  enableAksRoles?: boolean;
  enableIotRoles?: boolean;
  enableVaultRoles?: boolean;
};

interface Props
  extends Omit<DefaultResourceArgs, "monitoring">,
    Omit<BasicResourceArgs, "group"> {
  formattedName?: boolean;
  location?: string;
  /** Grant permission of this group into Environment Roles groups*/
  permissions?: RGPermissionType;
  //Resource group need a lock
  lock?: boolean;
}

export default ({
  name,
  formattedName,
  permissions,
  ...others
}: Props): ResourceResultProps<ResourceGroup> & {
  info: () => ResourceGroupInfo;
} => {
  name = formattedName ? name : getResourceGroupName(name);

  const { resource, locker, diagnostic } = ResourceCreator(ResourceGroup, {
    resourceGroupName: name,
    ...others,
  } as ResourceGroupArgs & DefaultResourceArgs);

  if (permissions) {
    grantEnvRolesAccess({
      name,
      ...permissions,
      scope: resource.id,
      dependsOn: resource,
    });
  }

  return {
    name,
    resource: resource as ResourceGroup,
    locker,
    diagnostic,
    info: () => ({
      resourceGroupName: name,
      location: currentRegionName,
    }),
  };
};
