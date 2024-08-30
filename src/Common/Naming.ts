import { ConventionProps, ReplacePattern, NamingType } from '../types';
import env from '../env';
import { currentCountryCode } from './AzureEnv';
import { organization, stack } from './StackEnv';

export const rules = {
  getResourceGroupName: {
    cleanName: false,
    suffix: `grp-${organization}`,
    maxLength: 90,
  },
  getStorageName: {
    cleanName: true,
    maxLength: 24,
    includeOrgName: true,
    suffix: 'stg',
    replaces: [{ from: /[-.]/g, to: '' }],
  },
  getSearchServiceName: {
    cleanName: true,
    includeOrgName: true,
    suffix: 'search',
    maxLength: 80,
  },
  getAppPlanName: {
    cleanName: true,
    //includeOrgName: false,
    suffix: 'app-plan',
    maxLength: 80,
  },
  getAutomationAccountName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'acc-auto',
  },
  getB2cName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'b2c',
  },
  getCosmosDbName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'cdb',
  },
  getAppConfigName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'cfg',
  },
  getApimName: {
    cleanName: true,
    includeOrgName: true,
    maxLength: 80,
    suffix: 'apim',
  },
  getDiskEncryptionName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'disk-encrypt',
  },
  getSshName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'ssh',
  },
  getIdentityName: {
    cleanName: true,
    maxLength: 80,
    suffix: '',
  },
  getUIDName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'uid',
  },
  getAksName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'aks',
  },
  getK8sProviderName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'ks-pvd',
  },
  getAppInsightName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'isg',
  },
  getLogWpName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'wp',
  },
  getWebAppName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'web',
  },
  getFuncAppName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'func',
  },
  getWebTestName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'wt',
  },
  getAlertName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'alt',
  },
  getRedisCacheName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'rds',
  },
  getServiceBusName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'bus',
  },
  getPrivateEndpointName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'pre',
  },
  getSignalRName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'sigr',
  },
  getElasticPoolName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'elp',
  },
  getSqlDbName: {
    cleanName: true,
    maxLength: 128,
    suffix: 'db',
  },
  getSqlServerName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'sql',
  },
  getPostgresqlName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'postgres',
  },
  getMySqlName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'mysql',
  },
  getFirewallName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'fw',
  },
  getFirewallPolicyName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'fwp',
  },
  getFirewallPolicyGroupName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'fw-pg',
  },
  getVMName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'vm',
  },
  getNICName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'nic',
  },
  getVdiName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'vdi',
  },
  getVpnName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'vpn',
  },
  getVnetName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'vnt',
  },
  getWanName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'wan',
  },
  getHubName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'hub',
  },
  getIotHubName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'iot',
  },
  getRouteName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'route',
  },
  //getRouteItemName: { cleanName: true, maxLength: 80, suffix: 'item' },
  getWorkflowName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'wkp',
  },
  getNetworkSGName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'nsg',
  },
  getIpAddressName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'ip',
  },
  getIpAddressPrefixName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'ipx',
  },
  getAppGatewayName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'gtw',
  },
  getNatGatewayName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'nat',
  },
  getBastionName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'bst',
  },
  getKeyVaultName: {
    cleanName: true,
    maxLength: 24,
    suffix: 'vlt',
    includeOrgName: true,
  },
  getCdnEndpointName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'cdn',
  },
  getCdnProfileName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'cdn-pfl',
  },
  getAcrName: {
    cleanName: true,
    maxLength: 24,
    prefix: '',
    suffix: 'acr',
    region: currentCountryCode,
    includeOrgName: true,
    replaces: [{ from: /[-.]/g, to: '' }],
  },
  getCertOrderName: {
    maxLength: 80,
    prefix: '',
    suffix: 'cert',
    replaces: [{ from: '.', to: '-' }],
  },
};

export type RulerTypes = typeof rules;
export type NamingFunc = (name: NamingType) => string;

const replaceSingleInString = (
  val: string,
  pattern: ReplacePattern,
): string => {
  let regex: RegExp;

  if (pattern.from instanceof RegExp) {
    // If 'from' is already a RegExp, use it directly
    regex = pattern.from;
  } else {
    // If 'from' is a string, convert it to a RegExp
    regex = new RegExp(
      pattern.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'g',
    );
  }
  // Replace occurrences of 'from' with 'to'
  return val.replace(regex, pattern.to);
};

export const replaceInString = (
  val: string,
  ...patterns: ReplacePattern[]
): string => {
  patterns.forEach((p) => (val = replaceSingleInString(val, p)));
  return val;
};

//======================================================================
export const replaceSpaceWithDash = (s: string) =>
  replaceInString(s, { from: ' ', to: '-' });
export const replaceDotWithDash = (s: string) =>
  replaceInString(s, { from: '.', to: '-' });

export const removeNumberAndDash = (s: string) => s.replace(/^\d+-/, '');
export const removeLeadingAndTrailingDash = (s: string) =>
  s.replace(/^-|-$/g, '');

export const cleanName = (name: string): string => {
  name = removeNumberAndDash(name);
  name = removeLeadingAndTrailingDash(name);
  return name;
};

export const getResourceName = (
  name: string,
  convention: ConventionProps = {},
): string => {
  if (env.DPA_NAMING_DISABLE_PREFIX) convention.prefix = undefined;
  else if (convention.prefix === undefined) convention.prefix = stack;

  if (env.DPA_NAMING_DISABLE_SUFFIX) convention.suffix = undefined;

  if (env.DPA_NAMING_DISABLE_REGION) convention.region = undefined;
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
  if (convention.suffix && !name.includes(convention.suffix.toLowerCase()))
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

//======================================================================

const namingResult: Record<string, NamingFunc> = {};
export function namingCreator(): Record<keyof RulerTypes, NamingFunc> {
  if (Object.keys(namingResult).length > 0)
    return namingResult as Record<keyof RulerTypes, NamingFunc>;

  Object.keys(rules).forEach((r) => {
    const rule = (rules as any)[r] as ConventionProps;

    namingResult[r] = (name: NamingType) => {
      const n = typeof name === 'string' ? name : name.val;
      const c = typeof name === 'string' ? undefined : name.rule;
      return getResourceName(n, { ...c, ...rule });
    };
  });

  return namingResult as Record<keyof RulerTypes, NamingFunc>;
}

export default namingCreator();
