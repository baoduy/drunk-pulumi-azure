import * as containerservice from '@pulumi/azure-native/containerservice';
import { KeyVaultInfo, ResourceGroupInfo } from '../types';
import { getIdentitySecrets } from '../AzAd/Helper';
import { getAksName, getResourceGroupName } from '../Common/Naming';
import { createProvider } from '../KubeX/Providers';

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
  namespace?: string;
  group: ResourceGroupInfo;
}

export const createAksProvider = async ({
  aksName,
  namespace,
  group,
}: AksProps) =>
  createProvider({
    name: aksName,
    namespace,
    kubeconfig: await getAksConfig({
      name: aksName,
      groupName: group.resourceGroupName,
    }),
  });
