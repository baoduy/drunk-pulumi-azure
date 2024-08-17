import naming from '../Naming';
import { ConventionProps, ResourceInfo } from '../../types';
import { currentRegionCode } from '../AzureEnv';

type RulerTypes = typeof naming;
type ResourceNamingType = Omit<
  RulerTypes,
  'cleanName' | 'getResourceGroupName'
>;

type ResourceNamingFunc = (
  groupName: string,
  resourceNameOrConvention?: string | ConventionProps,
) => Omit<ResourceInfo, 'id'>;

const resourceNamingCreator = () => {
  const rs: Record<string, ResourceNamingFunc> = {};

  Object.keys(naming).forEach((k) => {
    const formater = (naming as any)[k];

    rs[k] = (
      groupName: string,
      resourceNameOrConvention?: string | ConventionProps,
    ): Omit<ResourceInfo, 'id'> => {
      const rgName =
        typeof resourceNameOrConvention === 'string' ||
        resourceNameOrConvention === undefined
          ? naming.getResourceGroupName(groupName)
          : naming.getResourceGroupName({
              val: groupName,
              rule: resourceNameOrConvention,
            });

      const resourceName =
        typeof resourceNameOrConvention === 'string'
          ? formater(resourceNameOrConvention)
          : formater({ val: groupName, rule: resourceNameOrConvention });

      return {
        name: resourceName,
        group: { resourceGroupName: rgName, location: currentRegionCode },
      };
    };
  });

  return rs as Record<keyof ResourceNamingType, ResourceNamingFunc>;
};

export default resourceNamingCreator();
