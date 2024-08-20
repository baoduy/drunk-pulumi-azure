import * as cs from '@pulumi/azure-native/containerservice';
import { defaultSubScope, naming } from '../Common';
import { KeyVaultInfo, ResourceInfo, WithNamedType } from '../types';
import { getSecret } from '../KeyVault/Helper';
import { interpolate } from '@pulumi/pulumi';

/** Get AKS Config from Managed Cluster*/
export const getAksConfig = async ({
  resourceInfo,
  disableLocalAccounts,
}: {
  resourceInfo: ResourceInfo;
  disableLocalAccounts?: boolean;
}): Promise<string> => {
  const aks = disableLocalAccounts
    ? await cs.listManagedClusterUserCredentials({
        resourceName: resourceInfo.name,
        resourceGroupName: resourceInfo.group.resourceGroupName,
      })
    : await cs.listManagedClusterAdminCredentials({
        resourceName: resourceInfo.name,
        resourceGroupName: resourceInfo.group.resourceGroupName,
      });

  return Buffer.from(aks.kubeconfigs[0].value, 'base64').toString('utf8');
};

/** Get AKS Config from Key Vault*/
export const getAksConfigFromVault = async ({
  name,
  version,
  vaultInfo,
}: WithNamedType & {
  version?: string;
  vaultInfo: KeyVaultInfo;
}): Promise<string> => {
  const aksName = naming.getAksName(name);
  const rs = await getSecret({
    name: `${aksName}-config`,
    version,
    vaultInfo,
  });
  return rs?.value || '';
};

export const getAksPrivateDnsZone = async (
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
    group: { resourceGroupName: rsGroup, location: 'global' },
    id: interpolate`${defaultSubScope}/resourceGroups/${rsGroup}/providers/Microsoft.Network/privateDnsZones/${dnsName}`,
  } as ResourceInfo;
};
