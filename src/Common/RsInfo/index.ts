import rsHelper from './Helper';
import naming, { cleanName } from '../Naming';
import { interpolate, output, Output } from '@pulumi/pulumi';
import {
  currentRegionCode,
  currentRegionName,
  defaultSubScope,
  subscriptionId,
} from '../AzureEnv';
import {
  NamingType,
  ResourceGroupInfo,
  ResourceGroupWithIdInfo,
  ResourceInfo,
  ResourceInfoWithSub,
} from '../../types';

export const getResourceInfoFromId = (
  id: string,
): ResourceInfoWithSub | undefined => {
  if (!id) return undefined;

  const details = id.trim().split('/');
  let name = '';
  let groupName = '';
  let subId = '';

  details.forEach((d, index) => {
    if (d === 'subscriptions') subId = details[index + 1];
    if (d === 'resourceGroups' || d === 'resourcegroups')
      groupName = details[index + 1];
    if (index === details.length - 1) name = d;
  });

  return {
    name,
    id: output(id),
    group: { resourceGroupName: groupName, location: currentRegionName },
    subscriptionId: subId ?? subscriptionId,
  };
};

export const getNameFromId = (id: string) => {
  id = id.trim();

  //Resource ID
  if (id.includes('/')) {
    return id.split('/').pop();
  }
  //Domain
  if (id.includes('.')) return id.split('.')[0];
  //If not just get last 25 character
  return id.slice(-25);
};

/** The method to get Resource group Name*/
export const getRGId = (group: ResourceGroupInfo) =>
  interpolate`${defaultSubScope}/resourceGroups/${group.resourceGroupName}`;

export const getRGInfo = (name: NamingType): ResourceGroupWithIdInfo => {
  const rgName = naming.getResourceGroupName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${rgName}`;
  return { resourceGroupName: rgName, id, location: currentRegionCode };
};

export const getStorageInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getStorageName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${info.name}`;
  return { ...info, id };
};

// export const getAppPlanInfo = (name: string): ResourceInfo => {
//   const info = rsHelper.getAppPlanName(name);
//   const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${info.name}`;
//   return { ...info, id };
// };

export const getAutomationAccountInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getAutomationAccountName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Automation/automationAccounts/${info.name}`;
  return { ...info, id };
};

// export const getB2cName = (name: string) =>
//   getResourceName(name, { suffix: 'b2c' });
//
// export const getCosmosDbName = (name: string) =>
//   getResourceName(name, { suffix: 'cdb' });

export const getAppConfigInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getAppConfigName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.AppConfiguration/configurationStores/${info.name}`;
  return { ...info, id };
};

export const getApimInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getApimName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.ApiManagement/service/${info.name}`;
  return { ...info, id };
};

export const getAksInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getAksName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/${info.name}`;
  return { ...info, id };
};

export const getAppInsightInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getAppInsightName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Insights/components/${info.name}`;
  return { ...info, id };
};

export const getLogWpInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getLogWpName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${info.name}`;
  return { ...info, id };
};

// export const getWebAppName = (name: string) =>
//   getResourceName(name, { suffix: 'web' });
//
// export const getFuncAppName = (name: string) =>
//   getResourceName(name, { suffix: 'func' });

export const getRedisCacheInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getRedisCacheName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Cache/Redis/${info.name}`;
  return { ...info, id };
};

export const getServiceBusInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getServiceBusName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.ServiceBus/namespaces/${info.name}`;
  return { ...info, id };
};

export const getSignalRInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getSignalRName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.SignalRService/SignalR/${info.name}`;
  return { ...info, id };
};

export const getSqlServerInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getSqlServerName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Sql/servers/${info.name}`;
  return { ...info, id };
};

export const getPostgresqlInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getPostgresqlName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${info.name}`;
  return { ...info, id };
};

export const getMySqlInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getMySqlName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.DBforMySQL/flexibleServers/${info.name}`;
  return { ...info, id };
};

export const getFirewallInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getFirewallName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Network/azureFirewalls/${info.name}`;
  return { ...info, id };
};

export const getVMInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getVMName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Compute/virtualMachines/${info.name}`;
  return { ...info, id };
};

// export const getVpnName = (name: string) =>
//   getResourceName(name, { suffix: 'vpn' });

export const getVnetInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getVnetName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${info.name}`;
  return { ...info, id };
};

export const getVnetIdFromSubnetId = (subnetId: string) => {
  //The sample SubnetId is /subscriptions/63a31b41-eb5d-4160-9fc9-d30fc00286c9/resourceGroups/sg-dev-aks-vnet/providers/Microsoft.Network/virtualNetworks/sg-vnet-trans/subnets/aks-main-nodes
  return subnetId.split('/subnets')[0];
};

export const getSubnetIdByName = (
  subnetName: string,
  vnetAndGroupName: NamingType,
): Output<string> => {
  const vnetName = naming.getVnetName(vnetAndGroupName);
  const group = naming.getResourceGroupName(vnetAndGroupName);
  return interpolate`${defaultSubScope}/resourceGroups/${group}/providers/Microsoft.Network/virtualNetworks/${vnetName}/subnets/${cleanName(subnetName)}`;
};

export const getIpAddressInfo = ({
  name,
  groupName,
}: {
  name: string;
  groupName: NamingType;
}): ResourceInfo => {
  name = naming.getIpAddressName(name);
  const rgName = naming.getResourceGroupName(groupName);
  const id = interpolate`${defaultSubScope}/resourceGroups/${rgName}/providers/Microsoft.Network/publicIPAddresses/${name}`;

  return {
    name,
    group: { resourceGroupName: rgName, location: currentRegionCode },
    id,
  };
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

export const getKeyVaultInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getKeyVaultName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.KeyVault/vaults/${info.name}`;
  return { ...info, id };
};

export const getCdnProfileInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getCdnProfileName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.Cdn/profiles/${info.name}`;
  return { ...info, id };
};

export const getAcrInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getAcrName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.ContainerRegistry/registries/${info.name}`;
  return { ...info, id };
};

export const getCertOrderInfo = (name: NamingType): ResourceInfo => {
  const info = rsHelper.getCertOrderName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${info.group.resourceGroupName}/providers/Microsoft.CertificateRegistration/certificateOrders/${info.name}`;
  return { ...info, id };
};
