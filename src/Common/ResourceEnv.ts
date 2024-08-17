import * as process from 'node:process';
import { currentCountryCode } from './AzureEnv';
import { ConventionProps, ReplacePattern } from '../types';
import { organization, stack } from './StackEnv';

const replaceInString = (val: string, pattern: ReplacePattern): string => {
  let regex: RegExp;

  if (pattern.from instanceof RegExp) {
    // If 'from' is already a RegExp, use it directly
    regex = pattern.from;
  } else {
    // If 'from' is a string, convert it to a RegExp
    regex = new RegExp(pattern.from, 'g');
  }
  // Replace occurrences of 'from' with 'to'
  return val.replace(regex, pattern.to);
};

const removeNumberAndDash = (s: string) => s.replace(/^\d+-/, '');
const removeLeadingAndTrailingDash = (s: string) => s.replace(/^-|-$/g, '');
const replaceSpaceWithDash = (s: string) => s.replace(/\s+/g, '-');

export const cleanName = (name: string): string => {
  name = removeNumberAndDash(name);
  name = removeLeadingAndTrailingDash(name);
  return name;
};

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

  name = replaceSpaceWithDash(name).toLowerCase();
  if (convention.cleanName) name = cleanName(name);

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

  name = rs.join('-');

  if (convention.replaces)
    convention.replaces.forEach((p) => (name = replaceInString(name, p)));

  if (convention.maxLength && name.length > convention.maxLength)
    name = removeLeadingAndTrailingDash(
      name.substring(0, convention.maxLength),
    );

  return name;
};
