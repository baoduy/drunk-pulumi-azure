import naming from '../Naming';
import { ResourceInfo, NamingType } from '../../types';
import { currentRegionCode } from '../AzureEnv';

type RulerTypes = typeof naming;
type ResourceNamingType = Omit<
  RulerTypes,
  'cleanName' | 'getResourceGroupName'
>;

type ResourceNamingFunc = (
  groupName: NamingType,
  resourceName?: NamingType,
) => Omit<ResourceInfo, 'id'>;

const resourceNamingCreator = () => {
  const rs: Record<string, ResourceNamingFunc> = {};

  Object.keys(naming).forEach((k) => {
    const formater = (naming as any)[k];

    rs[k] = (
      groupName: NamingType,
      resourceName: NamingType | undefined = undefined,
    ): Omit<ResourceInfo, 'id'> => {
      const rgName = naming.getResourceGroupName(groupName);
      const rsName = resourceName
        ? formater(resourceName)
        : formater(groupName);

      return {
        name: rsName,
        group: { resourceGroupName: rgName, location: currentRegionCode },
      };
    };
  });

  return rs as Record<keyof ResourceNamingType, ResourceNamingFunc>;
};

export default resourceNamingCreator();
