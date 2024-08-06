import * as naming from '../Naming';
import { ConventionProps, ResourceInfo } from '../../types';
import { currentRegionCode } from '../AzureEnv';

type NamingType = typeof naming;
type ResourceNamingType = Omit<
  NamingType,
  'cleanName' | 'getResourceGroupName'
>;

type ResourceNamingFunc = (
  groupName: string,
  resourceNameOrConvention?: string | ConventionProps,
) => Omit<ResourceInfo, 'id'>;

const resourceNamingCreator = () => {
  const rs: Record<string, ResourceNamingFunc> = {};

  Object.keys(naming).forEach((k: any) => {
    const formater = (naming as any)[k];
    rs[k] = (
      groupName: string,
      resourceNameOrConvention?: string | ConventionProps,
    ): Omit<ResourceInfo, 'id'> => {
      const rgName = naming.getResourceGroupName(groupName);
      const resourceName =
        typeof resourceNameOrConvention === 'string'
          ? formater(naming.cleanName(resourceNameOrConvention))
          : formater(naming.cleanName(groupName), resourceNameOrConvention);

      return {
        name: resourceName,
        group: { resourceGroupName: rgName, location: currentRegionCode },
      };
    };
  });

  return rs as Record<keyof ResourceNamingType, ResourceNamingFunc>;
};

export default resourceNamingCreator();
