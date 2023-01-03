import * as containerservice from '@pulumi/azure-native/containerservice';

import { getIdentitySecrets } from '../AzAd/Helper';
import { getAksName, getResourceGroupName } from '../Common/Naming';
import { createProvider } from '../KubeX/Providers';
import { KeyVaultInfo } from '../types';

export const getAksConfig = async ({
  name,
  groupName,
}: {
  name: string;
  groupName?: string;
}) => {
  const aksName = getAksName(name);
  const group = groupName || getResourceGroupName(name);

  const aks = await containerservice.listManagedClusterAdminCredentials({
    resourceName: aksName,
    resourceGroupName: group,
  });

  return Buffer.from(aks.kubeconfigs[0].value, 'base64').toString('utf8');
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

}

export const createAksProvider = async ({
  aksName,
  namespace,
  groupName,
  formatedName,
}: AksProps) =>
  createProvider({
    name: aksName,
    namespace,
    kubeconfig: await getAksConfig({
      name: formatedName ? aksName : getAksName(aksName),
      groupName: formatedName ? groupName : getResourceGroupName(groupName),
    }),
  });
