import { ConventionProps } from '../../types';
import { replaceAll } from '../Helpers';
import { getResourceName } from '../ResourceEnv';
import { organization, stack } from '../StackEnv';

/** The method to get Resource group Name*/
export const getResourceGroupName = (name: string): string =>
  getResourceName(name, {
    suffix: organization ? `grp-${organization}` : 'grp',
  });

/** Get Azure Storage Account and CosmosDb Name*/
export const getStorageName = (name: string): string => {
  name = getResourceName(name, { includeOrgName: true, suffix: 'stg' });
  name = replaceAll(name, '-', '');
  name = replaceAll(name, '.', '');
  return name.toLowerCase().substring(0, 24);
};

/** Get Vault Secret Name. Remove the stack name and replace all _ with - then lower cases. */
export const getSecretName = (name: string) => {
  name = name.replace(`${stack}-`, '');
  name = name.replace(stack, '');
  name = replaceAll(name, ' ', '-');
  name = replaceAll(name, '.', '-');
  return replaceAll(name, '_', '-').toLowerCase();
};

export const getAppPlanName = (name: string) =>
  getResourceName(name, { includeOrgName: false, suffix: 'app-plan' });

export const getCertName = (name: string) => {
  name = getSecretName(name);
  return `${name}-cert`;
};

export const getConnectionName = (
  name: string,
  type: 'primary' | 'secondary'
) => `${getSecretName(name)}-conn-${type}`;

export const getKeyName = (name: string, type: 'primary' | 'secondary') =>
  `${getSecretName(name)}-key-${type}`;

export const getPasswordName = (
  name: string,
  type: 'primary' | 'secondary' | null
) =>
  type === null
    ? getResourceName(name, { suffix: 'pwd' })
    : `${getSecretName(name)}-pwd-${type}`;

export const getAutomationAccountName = (name: string) =>
  getResourceName(name, { suffix: 'acc-auto' });

export const getB2cName = (name: string) =>
  getResourceName(name, { suffix: 'b2c' });

export const getCosmosDbName = (name: string) =>
  getResourceName(name, { suffix: 'cdb' });

export const getAppConfigName = (name: string) =>
  getResourceName(name, { suffix: 'cfg' });

export const getApimName = (name: string) =>
  getResourceName(name, { suffix: 'apim' });

export const getSshName = (name: string) =>
  getResourceName(name, { suffix: 'ssh' });

export const getIdentityName = (name: string) => getResourceName(name);

export const getManagedIdentityName = (name: string) =>
  getResourceName(name, { suffix: 'mid' });

export const getAksName = (name: string) =>
  getResourceName(name, { suffix: 'aks' });

export const getK8sProviderName = (name: string) =>
  getResourceName(name, { suffix: 'ks-pvd' });

export const getAppInsightName = (name: string) =>
  getResourceName(name, { suffix: 'isg' });

export const getLogWpName = (name: string) =>
  getResourceName(name, { suffix: 'wp' });

export const getWebAppName = (name: string) =>
  getResourceName(name, { suffix: 'web' });

export const getFuncAppName = (name: string) =>
  getResourceName(name, { suffix: 'func' });

export const getWebTestName = (name: string) =>
  getResourceName(name, { suffix: 'hlz' });

export const getAlertName = (name: string) =>
  getResourceName(name, { suffix: 'alt' });

export const getRedisCacheName = (name: string) =>
  getResourceName(name, { suffix: 'rds' });

export const getServiceBusName = (name: string) =>
  getResourceName(name, { suffix: 'bus' });

export const getPrivateEndpointName = (name: string) =>
  getResourceName(name, { suffix: 'pre' });

export const getSignalRName = (name: string) =>
  getResourceName(name, { suffix: 'sigr' });

export const getElasticPoolName = (name: string) =>
  getResourceName(name, { suffix: 'elp' });

export const getSqlDbName = (name: string) =>
  getResourceName(name, { suffix: 'db' });

export const getSqlServerName = (name: string) =>
  getResourceName(name, { suffix: 'sql' });

export const getPostgresqlName = (name: string) =>
  getResourceName(name, { suffix: 'postgres' });

export const getMySqlName = (name: string) =>
  getResourceName(name, { suffix: 'mysql' });

export const getFirewallName = (name: string) =>
  getResourceName(name, { suffix: 'fw' });

export const getFirewallPolicyName = (name: string) =>
  getResourceName(name, { suffix: 'fwp' });

export const getFirewallPolicyGroupName = (name: string) =>
  getResourceName(name, { suffix: 'fw-pg' });

export const getVMName = (name: string) =>
  getResourceName(name, { suffix: 'vm' });

export const getNICName = (name: string) =>
  getResourceName(name, { suffix: 'nic' });

export const getVnetName = (name: string) =>
  getResourceName(name, { suffix: 'vnt' });

export const getWanName = (name: string) =>
  getResourceName(name, { suffix: 'wan' });

export const getHubName = (name: string) =>
  getResourceName(name, { suffix: 'hub' });

export const getIotHubName = (name: string) =>
  getResourceName(name, { suffix: 'iot' });

export const getRouteName = (name: string) =>
  getResourceName(name, { suffix: 'route' });

export const getRouteItemName = (name: string) =>
  getResourceName(name, { suffix: '', includeOrgName: false });

export const getNetworkSecurityGroupName = (name: string) =>
  getResourceName(name, { suffix: 'nsg' });

export const getIpAddressName = (name: string) =>
  getResourceName(name, { suffix: 'ip' });

export const getIpAddressPrefixName = (name: string) =>
  getResourceName(name, { suffix: 'ipx' });

export const getAppGatewayName = (name: string) =>
  getResourceName(name, { suffix: 'gtw' });

export const getBastionName = (name: string) =>
  getResourceName(name, { suffix: 'bst' });

/**Key vault allow to disable or custom the convention. The max length of vault name is 24*/
export const getKeyVaultName = (
  name: string,
  convention: ConventionProps | false = {
    suffix: 'vlt',
    includeOrgName: true,
  }
) =>
  getResourceName(
    name,
    convention == false
      ? { prefix: '', suffix: '', includeOrgName: true }
      : convention
  ).substring(0, 24);

export const getCdnEndpointName = (name: string) =>
  getResourceName(name, { suffix: 'cdn' });

/**The CDN Profile is created to Global group so no prefix*/
export const getCdnProfileName = (name: string) =>
  getResourceName(name, { suffix: 'cdn-pfl' });

/**The Azure Container Registry is created to Global group so no prefix*/
export const getAcrName = (name: string) =>
  replaceAll(getResourceName(name, { prefix: '', suffix: 'acr' }), '-', '');

/**The App Cert Order is created to Global group so no prefix*/
export const getCertOrderName = (name: string) =>
  getResourceName(name.replace('.', '-'), { prefix: '', suffix: 'ca' });
