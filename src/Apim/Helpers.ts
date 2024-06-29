import { ResourceInfo } from "../types";
import { getApimName, getResourceGroupName } from "../Common/Naming";
import { interpolate } from "@pulumi/pulumi";
import { currentRegionName, subscriptionId } from "../Common/AzureEnv";

export const getApimInfo = (nameAndGroup: string): ResourceInfo => {
  const name = getApimName(nameAndGroup);
  const rgName = getResourceGroupName(nameAndGroup);
  const id = interpolate`/subscriptions/${subscriptionId}/resourceGroups/${rgName}/providers/Microsoft.ApiManagement/service/${name}`;

  return {
    resourceName: name,
    group: { resourceGroupName: rgName, location: currentRegionName },
    id,
  };
};
