import rsHelper from './Helper';
import { interpolate } from '@pulumi/pulumi';
import { currentRegionCode, defaultSubScope } from '../AzureEnv';
import { ResourceGroupWithIdInfo, ResourceInfo } from '../../types';

/** The method to get Resource group Name*/
export const getResourceGroupInfo = (name: string): ResourceGroupWithIdInfo => {
  const rgName = rsHelper.getResourceGroupInfo(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${rgName}`;
  return { resourceGroupName: rgName, id, location: currentRegionCode };
};

export const getStorageInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getStorageName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${info.name}`;
  return { ...info, id };
};

// export const getAppPlanInfo = (name: string): ResourceInfo => {
//   const info = rsHelper.getAppPlanName(name);
//   const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${info.name}`;
//   return { ...info, id };
// };

export const getAutomationAccountInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getAutomationAccountName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Automation/automationAccounts/${info.name}`;
  return { ...info, id };
};

// export const getB2cName = (name: string) =>
//   getResourceName(name, { suffix: 'b2c' });
//
// export const getCosmosDbName = (name: string) =>
//   getResourceName(name, { suffix: 'cdb' });

export const getAppConfigInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getAppConfigName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.AppConfiguration/configurationStores/${info.name}`;
  return { ...info, id };
};

export const getApimInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getApimName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.ApiManagement/service/${info.name}`;
  return { ...info, id };
};

export const getAksInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getAksName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/${info.name}`;
  return { ...info, id };
};

export const getAppInsightInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getAppInsightName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Insights/components/${info.name}`;
  return { ...info, id };
};

export const getLogWpInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getLogWpName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${info.name}`;
  return { ...info, id };
};

// export const getWebAppName = (name: string) =>
//   getResourceName(name, { suffix: 'web' });
//
// export const getFuncAppName = (name: string) =>
//   getResourceName(name, { suffix: 'func' });

export const getRedisCacheInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getRedisCacheName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Cache/Redis/${info.name}`;
  return { ...info, id };
};

export const getServiceBusInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getServiceBusName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.ServiceBus/namespaces/${info.name}`;
  return { ...info, id };
};

export const getSignalRInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getSignalRName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.SignalRService/SignalR/${info.name}`;
  return { ...info, id };
};

export const getSqlServerInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getSqlServerName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Sql/servers/${info.name}`;
  return { ...info, id };
};

export const getPostgresqlInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getPostgresqlName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${info.name}`;
  return { ...info, id };
};

export const getMySqlInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getMySqlName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.DBforMySQL/flexibleServers/${info.name}`;
  return { ...info, id };
};

export const getFirewallInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getFirewallName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Network/azureFirewalls/${info.name}`;
  return { ...info, id };
};

export const getVMInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getVMName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Compute/virtualMachines/${info.name}`;
  return { ...info, id };
};

// export const getVpnName = (name: string) =>
//   getResourceName(name, { suffix: 'vpn' });

export const getVnetInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getVnetName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${info.name}`;
  return { ...info, id };
};

// export const getWanName = (name: string) =>
//   getResourceName(name, { suffix: 'wan' });
//
// export const getHubName = (name: string) =>
//   getResourceName(name, { suffix: 'hub' });
//
// export const getIotHubName = (name: string) =>
//   getResourceName(name, { suffix: 'iot' });
//
// export const getWorkflowName = (name: string) =>
//   getResourceName(name, { suffix: 'wkp' });
//
// export const getIpAddressName = (name: string) =>
//   getResourceName(name, { suffix: 'ip' });
//
// export const getIpAddressPrefixName = (name: string) =>
//   getResourceName(name, { suffix: 'ipx' });
//
// export const getAppGatewayName = (name: string) =>
//   getResourceName(name, { suffix: 'gtw' });
//
// export const getNatGatewayName = (name: string) =>
//   getResourceName(name, { suffix: 'ngw' });
//
// export const getBastionName = (name: string) =>
//   getResourceName(name, { suffix: 'bst' });

/**Key vault allow to disable or custom the convention. The max length of vault name is 24*/
export const getKeyVaultInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getKeyVaultName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.KeyVault/vaults/${info.name}`;
  return { ...info, id };
};

export const getCdnProfileInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getCdnProfileName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Cdn/profiles/${info.name}`;
  return { ...info, id };
};

/**The Azure Container Registry is created to Global group so no prefix*/
export const getAcrInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getAcrName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.ContainerRegistry/registries/${info.name}`;
  return { ...info, id };
};

/**The App Cert Order is created to Global group so no prefix*/
export const getCertOrderInfo = (name: string): ResourceInfo => {
  const info = rsHelper.getCertOrderName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.CertificateRegistration/certificateOrders/${info.name}`;
  return { ...info, id };
};
