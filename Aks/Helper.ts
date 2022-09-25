import * as containerservice from "@pulumi/azure-native/containerservice";
import { KeyVaultInfo } from "../types";
import { getIdentitySecrets } from "../AzAd/Helper";
import { getAksName, getResourceGroupName } from "../Common/Naming";

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
