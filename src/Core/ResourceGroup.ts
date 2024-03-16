import {
  DefaultResourceArgs,
  ResourceGroupInfo,
  ResourceResultProps,
  BasicResourceArgs,
} from '../types';
import {
  ResourceGroup,
  ResourceGroupArgs,
} from '@pulumi/azure-native/resources';
import ResourceCreator from './ResourceCreator';
import { getResourceGroupName } from '../Common/Naming';
import { EnvRoleNamesType } from '../AzAd/EnvRoles';
import { assignRolesToGroup } from '../AzAd/Group';

interface Props
  extends Omit<DefaultResourceArgs, 'monitoring'>,
    Omit<BasicResourceArgs, 'group'> {
  formattedName?: boolean;
  location?: string;
  /** Grant permission of this group into Environment Roles groups*/
  envRoleNames?: EnvRoleNamesType;
}

// export const getResourceGroupInfo = (name: string, globalGroup?: boolean) => ({
//   resourceGroupName: getResourceGroupName(name),
// });

export default ({
  name,
  formattedName,
  envRoleNames,
  ...others
}: Props): ResourceResultProps<ResourceGroup> & {
  toGroupInfo: () => ResourceGroupInfo;
} => {
  name = formattedName ? name : getResourceGroupName(name);

  const { resource, locker, diagnostic } = ResourceCreator(ResourceGroup, {
    resourceGroupName: name,
    ...others,
  } as ResourceGroupArgs & DefaultResourceArgs);

  const g = resource as ResourceGroup;

  if (envRoleNames) {
    assignRolesToGroup({
      groupName: envRoleNames.readOnly,
      roles: ['Reader'],
      scope: g.id,
    });
    assignRolesToGroup({
      groupName: envRoleNames.contributor,
      roles: ['Contributor'],
      scope: g.id,
    });
    assignRolesToGroup({
      groupName: envRoleNames.admin,
      roles: ['Owner'],
      scope: g.id,
    });
  }

  return {
    name,
    resource: g,
    locker,
    diagnostic,
    toGroupInfo: () => ({
      resourceGroupName: name,
      location: g.location,
    }),
  };
};
