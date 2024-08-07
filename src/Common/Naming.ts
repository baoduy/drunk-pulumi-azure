import { ConventionProps } from '../types';
import { currentCountryCode } from './AzureEnv';
import { replaceAll } from './Helpers';
import { getResourceName } from './ResourceEnv';
import { organization, stack } from './StackEnv';

const removeNumberAndDash = (s: string) => s.replace(/^\d+-/, '');
const removeLeadingAndTrailingDash = (s: string) => s.replace(/^-|-$/g, '');

export const cleanName = (name: string): string => {
  name = removeNumberAndDash(name);
  name = removeLeadingAndTrailingDash(name);
  return name;
};

/** The method to get Resource group Name*/
export const getResourceGroupName = (
  name: string,
  convention: ConventionProps = {},
): string =>
  getResourceName(name, {
    ...convention,
    suffix: organization ? `grp-${organization}` : 'grp',
  });

/** Get Azure Storage Account and CosmosDb Name*/
export const getStorageName = (
  name: string,
  convention: ConventionProps = {},
): string => {
  name = getResourceName(name, {
    ...convention,
    includeOrgName: true,
    suffix: 'stg',
  });
  name = replaceAll(name, '-', '');
  name = replaceAll(name, '.', '');
  name = name.toLowerCase().substring(0, 24);
  return removeLeadingAndTrailingDash(name);
};

/** Get Vault Secret Name. Remove the stack name and replace all _ with - then lower cases. */
export const getSecretName = (name: string) => {
  name = replaceAll(name, `${stack}-`, '');
  name = replaceAll(name, stack, '');
  name = replaceAll(name, ' ', '-');
  name = replaceAll(name, '.', '-');
  return replaceAll(name, '_', '-').toLowerCase();
};

export const getAppPlanName = (
  name: string,
  convention: ConventionProps = {},
) =>
  getResourceName(name, {
    ...convention,
    includeOrgName: false,
    suffix: 'app-plan',
  });

export const getCertName = (name: string) => {
  name = getSecretName(name);
  return `${name}-cert`;
};

export const getConnectionName = (
  name: string,
  type: 'primary' | 'secondary',
) => `${getSecretName(name)}-conn-${type}`;

export const getKeyName = (name: string, type: 'primary' | 'secondary') =>
  `${getSecretName(name)}-key-${type}`;

export const getPasswordName = (
  name: string,
  type: 'primary' | 'secondary' | null,
) =>
  type === null
    ? getResourceName(name, { suffix: 'pwd' })
    : `${getSecretName(name)}-pwd-${type}`;

export const getAutomationAccountName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'acc-auto' });

export const getB2cName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'b2c' });

export const getCosmosDbName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'cdb' });

export const getAppConfigName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'cfg' });

export const getApimName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'apim' });

export const getDiskEncryptionName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'disk-encrypt' });

export const getSshName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'ssh' });

export const getIdentityName = (name: string) => getResourceName(name);

export const getUIDName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'uid' });

export const getAksName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'aks' });

export const getK8sProviderName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'ks-pvd' });

export const getAppInsightName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'isg' });

export const getLogWpName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'wp' });

export const getWebAppName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'web' });

export const getFuncAppName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'func' });

export const getWebTestName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'hlz' });

export const getAlertName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'alt' });

export const getRedisCacheName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'rds' });

export const getServiceBusName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'bus' });

export const getPrivateEndpointName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'pre' });

export const getSignalRName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'sigr' });

export const getElasticPoolName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'elp' });

export const getSqlDbName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'db' });

export const getSqlServerName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'sql' });

export const getPostgresqlName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'postgres' });

export const getMySqlName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'mysql' });

export const getFirewallName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'fw' });

export const getFirewallPolicyName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'fwp' });

export const getFirewallPolicyGroupName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'fw-pg' });

export const getVMName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'vm' });

export const getNICName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'nic' });

export const getVdiName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'vdi' });

export const getVpnName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'vpn' });

export const getVnetName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'vnt' });

export const getWanName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'wan' });

export const getHubName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'hub' });

export const getIotHubName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'iot' });

export const getRouteName = (name: string, convention: ConventionProps = {}) =>
  getResourceName(name, { ...convention, suffix: 'route' });

export const getRouteItemName = (
  name: string,
  convention: ConventionProps = {},
) =>
  getResourceName(name, { ...convention, suffix: '', includeOrgName: false });

export const getWorkflowName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'wkp' });

export const getNetworkSecurityGroupName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'nsg' });

export const getIpAddressName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'ip' });

export const getIpAddressPrefixName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'ipx' });

export const getAppGatewayName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'gtw' });

export const getNatGatewayName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'ngw' });

export const getBastionName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'bst' });

/**Key vault allow to disable or custom the convention. The max length of vault name is 24*/
export const getKeyVaultName = (
  name: string,
  convention: ConventionProps = {},
) => {
  name = getResourceName(name, {
    ...convention,
    suffix: 'vlt',
    includeOrgName: true,
  }).substring(0, 24);
  return removeLeadingAndTrailingDash(name);
};

export const getCdnEndpointName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'cdn' });

/**The CDN Profile is created to Global group so no prefix*/
export const getCdnProfileName = (
  name: string,
  convention: ConventionProps = {},
) => getResourceName(name, { ...convention, suffix: 'cdn-pfl' });

/**The Azure Container Registry is created to Global group so no prefix*/
export const getAcrName = (name: string, convention: ConventionProps = {}) => {
  name = replaceAll(
    getResourceName(name, {
      ...convention,
      prefix: '',
      suffix: 'acr',
      region: currentCountryCode,
      includeOrgName: true,
    }),
    '-',
    '',
  ).substring(0, 24);
  return removeLeadingAndTrailingDash(name);
};

/**The App Cert Order is created to Global group so no prefix*/
export const getCertOrderName = (
  name: string,
  convention: ConventionProps = {},
) =>
  getResourceName(name.replace('.', '-'), {
    ...convention,
    prefix: '',
    suffix: 'ca',
  });
