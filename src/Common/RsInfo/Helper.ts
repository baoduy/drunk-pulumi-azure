import naming, { RulerTypes } from '../Naming';
import { ResourceInfo, NamingType } from '../../types';
import { currentRegionCode } from '../AzureEnv';

type ResourceNamingType = Omit<
  RulerTypes,
  'cleanName' | 'getResourceGroupName'
>;

type ResourceNamingFunc = (
  groupName: NamingType,
  resourceName?: NamingType,
) => Omit<ResourceInfo, 'id'>;

const rsNamingResult: Record<string, ResourceNamingFunc> = {};

const rsNamingCreator = () => {
  if (Object.keys(rsNamingResult).length > 0)
    return rsNamingResult as Record<
      keyof ResourceNamingType,
      ResourceNamingFunc
    >;

  Object.keys(naming).forEach((k) => {
    const formater = (naming as any)[k];

    rsNamingResult[k] = (
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

  return rsNamingResult as Record<keyof ResourceNamingType, ResourceNamingFunc>;
};

export default rsNamingCreator();
