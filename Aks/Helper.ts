import * as containerservice from '@pulumi/azure-native/containerservice';
import { getAksName, getResourceGroupName } from '../Common/Naming';
import { createProvider } from '../KubeX/Providers';
import { KeyVaultInfo } from '../types';
import { getSecret } from '../KeyVault/Helper';
import { getIdentitySecrets } from '../AzAd/Helper';

/** Get AKS Config from Managed Cluster*/
export const getAksConfig = async ({
  name,
  groupName,
  formattedName,
  localAccountDisabled,
}: {
  name: string;
  groupName: string;
  formattedName?: boolean;
  localAccountDisabled?: boolean;
}): Promise<string> => {
  const aksName = formattedName ? name : getAksName(name);
  const group = formattedName ? groupName : getResourceGroupName(groupName);

  const aks = localAccountDisabled
    ? await containerservice.listManagedClusterUserCredentials({
        resourceName: aksName,
        resourceGroupName: group,
      })
    : await containerservice.listManagedClusterAdminCredentials({
        resourceName: aksName,
        resourceGroupName: group,
      });

  return Buffer.from(aks.kubeconfigs[0].value, 'base64').toString('utf8');
};

/** Get AKS Config from Key Vault*/
export const getAksVaultConfig = async ({
  name,
  vaultInfo,
  formattedName,
}: {
  name: string;
  vaultInfo: KeyVaultInfo;
  formattedName?: boolean;
}): Promise<string> => {
  const aksName = formattedName ? name : getAksName(name);
  const rs = await getSecret({
    name: `${aksName}-config`,
    vaultInfo,
    nameFormatted: false,
  });
  return rs?.value || '';
};

export const getAksIdentitySecrets = async ({
  name,
  vaultInfo,
}: {
  name: string;
  vaultInfo: KeyVaultInfo;
}) => {
  name = getAksName(name);
  return getIdentitySecrets({ name, vaultInfo });
};

interface AksProps {
  aksName: string;
  formatedName?: boolean;
  namespace?: string;
  groupName: string;
  localAccountDisabled?: boolean;
}

/** Get AKS Provider from Managed Cluster*/
export const createAksProvider = async ({
  aksName,
  namespace,
  groupName,
  formatedName,
  localAccountDisabled,
}: AksProps) =>
  createProvider({
    name: aksName,
    namespace,
    kubeconfig: await getAksConfig({
      name: aksName,
      groupName,
      formattedName: formatedName,
      localAccountDisabled,
    }),
  });

/** Get AKS Provider from Key Vault*/
export const createAksVaultProvider = async ({
  aksName,
  secretName,
  namespace,
  vaultInfo,
}: {
  aksName: string;
  secretName?: string;
  vaultInfo: KeyVaultInfo;
  namespace?: string;
}) =>
  createProvider({
    name: aksName,
    namespace,
    ignoreChanges: true,
    kubeconfig: await getAksVaultConfig({
      name: secretName ?? aksName,
      formattedName: Boolean(secretName),
      vaultInfo,
    }),
  });
