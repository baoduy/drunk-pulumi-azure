import { currentCountryCode } from "./AzureEnv";
import { replaceAll } from "./Helpers";
import { ConventionProps } from "../types";
import { organization, stack } from "./StackEnv";

/** ==================== Resources Variables ========================= */

const getName = (name: string, convention: ConventionProps): string => {
  if (convention.prefix === undefined) convention.prefix = stack;
  if (convention.region === undefined) convention.region = currentCountryCode;
  //console.log(convention);

  if (!name) return name;
  name = replaceAll(name, " ", "-").toLowerCase();
  const rs: string[] = [];

  //Add prefix
  if (convention.prefix && !name.startsWith(convention.prefix.toLowerCase())) {
    rs.push(convention.prefix.toLowerCase());
  }

  rs.push(name);

  //Organization
  if (convention.includeOrgName && !name.includes(organization.toLowerCase())) {
    rs.push(organization.toLowerCase());
  }

  //Region
  if (convention.region && !name.includes(convention.region.toLowerCase())) {
    rs.push(convention.region.toLowerCase());
  }

  //Add the suffix
  if (convention.suffix && !name.endsWith(convention.suffix.toLowerCase()))
    rs.push(convention.suffix.toLowerCase());

  return rs.join("-");
};

/** The method to get Resource Name. This is not applicable for Azure Storage Account and CosmosDb*/
export const getResourceName = (
  name: string,
  convention: ConventionProps = {},
): string => getName(name, convention);
