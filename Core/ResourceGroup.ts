import * as native from '@pulumi/azure-native';

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

interface Props
  extends Omit<DefaultResourceArgs, 'monitoring'>,
    Omit<BasicResourceArgs, 'group'> {
  formattedName?: boolean;
}

export default async ({
  name,
  formattedName,
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
