import {
  OptsArgs,
  BasicResourceArgs,
  BasicResourceInfoWithInstance,
  ResourceGroupInfo,
} from '../types';
import {
  ResourceGroup,
  ResourceGroupArgs,
} from '@pulumi/azure-native/resources';
import ResourceCreator from './ResourceCreator';
import { getResourceGroupName } from '../Common';
import { EnvRolesResults } from '../AzAd/EnvRoles';
import { currentRegionName } from '../Common';
import { grantEnvRolesAccess, RoleEnableTypes } from '../AzAd/EnvRoles.Consts';

export type RGPermissionType = RoleEnableTypes & {
  envRoles: EnvRolesResults;
};

interface Props extends Omit<BasicResourceArgs, 'group'> {
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
}: Props): BasicResourceInfoWithInstance<ResourceGroup> & {
  info: () => ResourceGroupInfo;
} => {
  name = formattedName ? name : getResourceGroupName(name);

  const { resource, locker, diagnostic } = ResourceCreator(ResourceGroup, {
    resourceGroupName: name,
    ...others,
  } as ResourceGroupArgs & OptsArgs);

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
    instance: resource as ResourceGroup,
    id: resource.id,
    info: () => ({
      resourceGroupName: name,
      location: currentRegionName,
    }),
  };
};
