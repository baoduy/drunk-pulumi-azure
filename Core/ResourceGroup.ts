import {
  DefaultResourceArgs,
  ResourceGroupInfo,
  ResourceResultProps,
} from '../types';
import {
  ResourceGroup,
  ResourceGroupArgs,
} from '@pulumi/azure-native/resources';
import { BasicResourceArgs } from './../types.d';
import ResourceCreator from './ResourceCreator';
import { getResourceGroupName } from '../Common/Naming';
import { EnvRoleNamesType } from '../AzAd/EnvRoles';
import { assignRolesToGroup } from '../AzAd/Group';

interface Props
  extends Omit<DefaultResourceArgs, 'monitoring'>,
    Omit<BasicResourceArgs, 'group'> {
  formattedName?: boolean;

  /** Grant permission of this group into Environment Roles groups*/
  envRoleNames?: EnvRoleNamesType;
}

export default async ({
  name,
  formattedName,
  envRoleNames,
  ...others
}: Props): Promise<
  ResourceResultProps<ResourceGroup> & { toGroupInfo: () => ResourceGroupInfo }
> => {
  name = formattedName ? name : getResourceGroupName(name);

  const { resource, locker, diagnostic } = await ResourceCreator(
    ResourceGroup,
    {
      resourceGroupName: name,
      ...others,
    } as ResourceGroupArgs & DefaultResourceArgs
  );

  const g = resource as ResourceGroup;

  if (envRoleNames) {
    await assignRolesToGroup({
      groupName: envRoleNames.readOnly,
      roles: ['Reader'],
      scope: g.id,
    });
    await assignRolesToGroup({
      groupName: envRoleNames.contributor,
      roles: ['Contributor'],
      scope: g.id,
    });
    await assignRolesToGroup({
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
