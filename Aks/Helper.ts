import * as containerservice from '@pulumi/azure-native/containerservice';
import { getAksName, getResourceGroupName } from '../Common/Naming';
import { createProvider } from '../KubeX/Providers';
import { KeyVaultInfo } from '../types';
import { getSecret, getSecretVersions } from '../KeyVault/Helper';
import { getIdentitySecrets } from '../AzAd/Helper';
import * as console from 'console';

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
  version,
  vaultInfo,
  formattedName,
}: {
  name: string;
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
}: AksProps) => {
  return createProvider({
    name: aksName,
    namespace,
    kubeconfig: await getAksConfig({
      name: aksName,
      groupName,
      formattedName: formatedName,
      localAccountDisabled,
    }),
  });
};

/** Get AKS Provider from Key Vault*/
export const createAksVaultProvider = async ({
  aksName,
  version,
  secretName,
  namespace,
  vaultInfo,
}: {
  aksName: string;
  secretName?: string;
  version?: string;
  vaultInfo: KeyVaultInfo;
  namespace?: string;
}) => {
  return createProvider({
    name: aksName,
    namespace,
    ignoreChanges: true,
    kubeconfig: await getAksVaultConfig({
      name: secretName ?? aksName,
      version,
      formattedName: Boolean(secretName),
      vaultInfo,
    }),
  });
};
