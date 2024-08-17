import { currentCountryCode } from '../AzureEnv';
import { organization } from '../StackEnv';

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
  getAppPlanName: {
    cleanName: true,
    includeOrgName: false,
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

// /** Get Azure Storage Account and CosmosDb Name*/
// export const getStorageName = (
//   name: string,
//   convention: ConventionProps = {},
// ): string => {
//   name = getResourceName(name, {
//     ...convention,
//     includeOrgName: true,
//     suffix: 'stg',
//   });
//   // Replace all dashes and dots with empty strings, convert to lowercase, and limit to 24 characters
//   name = name.replace(/[-.]/g, '').toLowerCase().substring(0, 24);
//   return removeLeadingAndTrailingDash(name);
// };

// export const getAppPlanName = (
//   name: string,
//   convention: ConventionProps = {},
// ) =>
//   getResourceName(name, {
//     ...convention,
//     includeOrgName: false,
//     suffix: 'app-plan',
//   });

// export const getCertName = (name: string) => {
//   name = getSecretName(name);
//   return `${name}-cert`;
// };

// export const getConnectionName = (
//   name: string,
//   type: 'primary' | 'secondary',
// ) => `${getVaultItemName(name)}-conn-${type}`;

// export const getKeyName = (name: string, type: 'primary' | 'secondary') =>
//   `${getSecretName(name)}-key-${type}`;

// export const getPasswordName = (
//   name: string,
//   type: 'primary' | 'secondary' | null,
// ) =>
//   type === null
//     ? getResourceName(name, { suffix: 'pwd' })
//     : `${getSecretName(name)}-pwd-${type}`;

// export const getAutomationAccountName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'acc-auto' });

// export const getB2cName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'b2c' });

// export const getCosmosDbName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'cdb' });

// export const getAppConfigName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'cfg' });

// export const getApimName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'apim' });
//
// export const getDiskEncryptionName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'disk-encrypt' });

// export const getSshName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'ssh' });

// export const getIdentityName = (name: string) => getResourceName(name);

// export const getUIDName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'uid' });

// export const getAksName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'aks' });

// export const getK8sProviderName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'ks-pvd' });
//
// export const getAppInsightName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'isg' });

// export const getLogWpName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'wp' });
//
// export const getWebAppName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'web' });

// export const getFuncAppName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'func' });
//
// export const getWebTestName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'hlz' });

// export const getAlertName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'alt' });
//
// export const getRedisCacheName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'rds' });

// export const getServiceBusName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'bus' });

// export const getPrivateEndpointName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'pre' });
//
// export const getSignalRName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'sigr' });

// export const getElasticPoolName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'elp' });
//
// export const getSqlDbName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'db' });
//
// export const getSqlServerName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'sql' });

// export const getPostgresqlName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'postgres' });
//
// export const getMySqlName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'mysql' });
//
// export const getFirewallName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'fw' });

// export const getFirewallPolicyName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'fwp' });
//
// export const getFirewallPolicyGroupName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'fw-pg' });

// export const getVMName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'vm' });
//
// export const getNICName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'nic' });
//
// export const getVdiName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'vdi' });
//
// export const getVpnName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'vpn' });

// export const getVnetName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'vnt' });
//
// export const getWanName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'wan' });
//
// export const getHubName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'hub' });
//
// export const getIotHubName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'iot' });
//
// export const getRouteName = (name: string, convention: ConventionProps = {}) =>
//   getResourceName(name, { ...convention, suffix: 'route' });

// export const getRouteItemName = (
//   name: string,
//   convention: ConventionProps = {},
// ) =>
//   getResourceName(name, { ...convention, suffix: '', includeOrgName: false });

// export const getWorkflowName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'wkp' });
//
// export const getNetworkSecurityGroupName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'nsg' });
//
// export const getIpAddressName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'ip' });
//
// export const getIpAddressPrefixName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'ipx' });
//
// export const getAppGatewayName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'gtw' });

// export const getNatGatewayName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'ngw' });
//
// export const getBastionName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'bst' });

/**Key vault allow to disable or custom the convention. The max length of vault name is 24*/
// export const getKeyVaultName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => {
//   name = getResourceName(name, {
//     ...convention,
//     suffix: 'vlt',
//     includeOrgName: true,
//   }).substring(0, 24);
//   return removeLeadingAndTrailingDash(name);
// };

// export const getCdnEndpointName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'cdn' });
//
// /**The CDN Profile is created to Global group so no prefix*/
// export const getCdnProfileName = (
//   name: string,
//   convention: ConventionProps = {},
// ) => getResourceName(name, { ...convention, suffix: 'cdn-pfl' });

/**The Azure Container Registry is created to Global group so no prefix*/
// export const getAcrName = (name: string, convention: ConventionProps = {}) => {
//   name = replaceAll(
//     getResourceName(name, {
//       ...convention,
//       prefix: '',
//       suffix: 'acr',
//       region: currentCountryCode,
//       includeOrgName: true,
//     }),
//     '-',
//     '',
//   ).substring(0, 24);
//   return removeLeadingAndTrailingDash(name);
// };

/**The App Cert Order is created to Global group so no prefix*/
// export const getCertOrderName = (
//   name: string,
//   convention: ConventionProps = {},
// ) =>
//   getResourceName(name.replace('.', '-'), {
//     ...convention,
//     prefix: '',
//     suffix: 'ca',
//   });
