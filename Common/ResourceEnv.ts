import { replaceAll } from "./Helpers";
import { ConventionProps, ResourceGroupInfo } from "../types";
import { Input } from "@pulumi/pulumi";
import { BaseOptions } from "../CustomProviders/Base";
import { stack } from "./StackEnv";

export const resourceConvention = {
  prefix: stack,
  suffix: undefined, //This may be specified by each resource name
};

/** ==================== Resources Variables ========================= */

const getName = (name: string, convention: ConventionProps): string => {
  if (!name) return name;
  name = replaceAll(name, " ", "-");

  //Add prefix
  if (convention.prefix && !name.startsWith(convention.prefix))
    name = convention.prefix + "-" + name;

  //Add the suffix
  if (convention.suffix && !name.endsWith(convention.suffix))
    name = name + "-" + convention.suffix;

  return name.toLowerCase();
};

/** The method to get Resource Name. This is not applicable for Azure Storage Account and CosmosDb*/
export const getResourceName = (
  name: string,
  convention?: ConventionProps
): string => getName(name, { ...resourceConvention, ...convention });

export interface ResourceInfoArg {
  /**If name and provider of the resource is not provided then the Id will be resource group Id*/
  name?: Input<string>;
  /**The provider name of the resource ex: "Microsoft.Network/virtualNetworks" or "Microsoft.Network/networkSecurityGroups"*/
  provider?: string;

  group: BaseOptions<ResourceGroupInfo>;
  subscriptionId?: Input<string>;
}
