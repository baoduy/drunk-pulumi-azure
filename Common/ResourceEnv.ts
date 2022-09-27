import { replaceAll } from './Helpers';
import { ConventionProps, ResourceGroupInfo } from '../types';
import { Input } from '@pulumi/pulumi';
import { BaseOptions } from '../CustomProviders/Base';
import { resourceConvention } from './config';

/** ==================== Resources Variables ========================= */

const getName = (name: string, convention: ConventionProps): string => {
  if (!name) return name;
  name = replaceAll(name, ' ', '-');

  //Add prefix
  if (convention.prefix && !name.startsWith(convention.prefix))
    name = convention.prefix + '-' + name;

  //Add the suffix
  if (convention.suffix && !name.endsWith(convention.suffix))
    name = name + '-' + convention.suffix;

  return name.toLowerCase();
};

/** The method to get Resource Name. This is not applicable for Azure Storage Account and CosmosDb*/
export const getResourceName = (
  name: string,
  convention?: ConventionProps
): string => getName(name, { ...resourceConvention, ...convention });

/**Get Resource Info from Resource Id. Sample Id is "/subscriptions/01af663e-76dd-45ac-9e57-9c8e0d3ee350/resourceGroups/sandbox-codehbd-group-hbd/providers/Microsoft.Network/virtualNetworks/sandbox-codehbd-vnet-hbd"*/

export interface ResourceInfo {
  name: string;
  group: ResourceGroupInfo;
  subscriptionId: string;
  id: string;
}

export const getResourceInfoFromId = (id: string): ResourceInfo | undefined => {
  if (!id) return undefined;

  const details = id.split('/');
  let name = '';
  let groupName = '';
  let subscriptionId = '';

  details.forEach((d, index) => {
    if (d === 'subscriptions') subscriptionId = details[index + 1];
    if (d === 'resourceGroups' || d === 'resourcegroups')
      groupName = details[index + 1];
    if (index === details.length - 1) name = d;
  });

  return { name, id, group: { resourceGroupName: groupName }, subscriptionId };
};

export interface ResourceInfoArg {
  /**If name and provider of the resource is not provided then the Id will be resource group Id*/
  name?: Input<string>;
  /**The provider name of the resource ex: "Microsoft.Network/virtualNetworks" or "Microsoft.Network/networkSecurityGroups"*/
  provider?: string;

  group: BaseOptions<ResourceGroupInfo>;
  subscriptionId?: Input<string>;
}
