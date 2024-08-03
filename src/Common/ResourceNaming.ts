import * as naming from './Naming';
import { ResourceInfo } from '../types';
import { currentRegionCode } from './AzureEnv';

type NamingType = typeof naming;
type ResourceNamingType = Omit<
  NamingType,
  'cleanName' | 'getResourceGroupName'
>;
type ResourceNamingFunc = (groupName: string) => Omit<ResourceInfo, 'id'>;

const resourceNamingCreator = () => {
  const rs: Record<string, ResourceNamingFunc> = {};

  Object.keys(naming).forEach((k: any) => {
    const formater = (naming as any)[k];
    rs[k] = (groupName: string): Omit<ResourceInfo, 'id'> => {
      const resourceName = formater(naming.cleanName(groupName)) as string;
      const rgName = naming.getResourceGroupName(groupName);
      return {
        name: resourceName,
        group: { resourceGroupName: rgName, location: currentRegionCode },
      };
    };
  });

  return rs as Record<keyof ResourceNamingType, ResourceNamingFunc>;
};

export default resourceNamingCreator();
