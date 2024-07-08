import * as process from 'node:process';
import { currentCountryCode } from './AzureEnv';
import { replaceAll } from './Helpers';
import { ConventionProps } from '../types';
import { organization, stack } from './StackEnv';

export const getResourceName = (
  name: string,
  convention: ConventionProps = {},
): string => {
  if (process.env.DPA_NAMING_DISABLE_PREFIX === 'true')
    convention.prefix = undefined;
  else if (convention.prefix === undefined) convention.prefix = stack;

  if (process.env.DPA_NAMING_DISABLE_SUFFIX === 'true')
    convention.suffix = undefined;

  if (process.env.DPA_NAMING_DISABLE_REGION === 'true')
    convention.region = undefined;
  else if (convention.region === undefined)
    convention.region = currentCountryCode;

  if (!name) return name;
  name = replaceAll(name, ' ', '-').toLowerCase();
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

  return rs.join('-');
};
