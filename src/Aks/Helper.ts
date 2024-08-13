import * as cs from '@pulumi/azure-native/containerservice';
import { defaultSubScope, getAksName, getResourceGroupName } from '../Common';
import { globalKeyName } from '../Common/GlobalEnv';
import { KeyVaultInfo, ResourceInfo, WithNamedType } from '../types';
import { getSecret } from '../KeyVault/Helper';
import { interpolate, Output } from '@pulumi/pulumi';
import { subscriptionId } from '../Common/AzureEnv';

/** Get AKS Config from Managed Cluster*/
export const getAksConfig = async ({
  name,
  groupName,
  formattedName,
  disableLocalAccounts,
}: WithNamedType & {
  groupName: string;
  formattedName?: boolean;
  disableLocalAccounts?: boolean;
}): Promise<string> => {
  const aksName = formattedName ? name : getAksName(name);
  const group = formattedName ? groupName : getResourceGroupName(groupName);

  const aks = disableLocalAccounts
    ? await cs.listManagedClusterUserCredentials({
        resourceName: aksName,
        resourceGroupName: group,
      })
    : await cs.listManagedClusterAdminCredentials({
        resourceName: aksName,
        resourceGroupName: group,
      });

  return Buffer.from(aks.kubeconfigs[0].value, 'base64').toString('utf8');
};

/** Get AKS Config from Key Vault*/
export const getAksVaultConfig = async ({
  name,
  version,
  vaultInfo,
  formattedName,
}: WithNamedType & {
  version?: string;
  vaultInfo: KeyVaultInfo;
  formattedName?: boolean;
}): Promise<string> => {
  const aksName = formattedName ? name : getAksName(name);
  const rs = await getSecret({
    name: `${aksName}-config`,
    version,
    vaultInfo,
    nameFormatted: false,
  });
  return rs?.value || '';
};

export const getAksPrivateDnz = async (
  aksInfo: ResourceInfo,
): Promise<ResourceInfo | undefined> => {
  const aks = await cs.getManagedCluster({
    resourceName: aksInfo.name,
    resourceGroupName: aksInfo.group.resourceGroupName,
  });

  if (!aks.privateFQDN) return undefined;
  const dnsName = aks.privateFQDN.split('.').slice(1).join('.');
  const rsGroup = aks.nodeResourceGroup!;

  return {
    name: dnsName,
    group: { resourceGroupName: rsGroup, location: globalKeyName },
    id: interpolate`${defaultSubScope}/resourceGroups/${rsGroup}/providers/Microsoft.Network/privateDnsZones/${dnsName}`,
  } as ResourceInfo;
};
