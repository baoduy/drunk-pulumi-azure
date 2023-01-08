import * as containerservice from "@pulumi/azure-native/containerservice";

import { getIdentitySecrets } from "../AzAd/Helper";
import { getAksName, getResourceGroupName } from "../Common/Naming";
import { createProvider } from "../KubeX/Providers";
import { KeyVaultInfo } from "../types";

export const getAksConfig = async ({
  name,
  groupName,
  formattedName,
  localAccountDisabled
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

  return Buffer.from(aks.kubeconfigs[0].value, "base64").toString("utf8");
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

export const createAksProvider = async ({
  aksName,
  namespace,
  groupName,
  formatedName,
  localAccountDisabled
}: AksProps) =>
  createProvider({
    name: aksName,
    namespace,
    kubeconfig: await getAksConfig({
      name:  aksName ,
      groupName ,
      formattedName:formatedName,
      localAccountDisabled
    }),
  });
