import * as containerservice from "@pulumi/azure-native/containerservice";
import { getAksName, getResourceGroupName } from "../Common/Naming";
import { KeyVaultInfo, ResourceInfo, ResourceType } from "../types";
import { getSecret } from "../KeyVault/Helper";
import { getIdentitySecrets } from "../AzAd/Helper";
import { interpolate, output, Output } from "@pulumi/pulumi";
import { currentRegionName, subscriptionId } from "../Common/AzureEnv";
import { linkVnetToPrivateDns } from "../VNet/PrivateDns";

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

  return Buffer.from(aks.kubeconfigs[0].value, "base64").toString("utf8");
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
  return rs?.value || "";
};

export const getAksIdentitySecrets = ({
  name,
  vaultInfo,
}: {
  name: string;
  vaultInfo: KeyVaultInfo;
}) => {
  name = getAksName(name);
  return getIdentitySecrets({ name, vaultInfo });
};

export const getAksPrivateDnz = ({
  name,
  groupName,
  formattedName,
}: ResourceType): Output<ResourceInfo | undefined> => {
  name = formattedName ? name : getAksName(name);
  groupName = formattedName ? groupName : getResourceGroupName(groupName);

  const aks = containerservice.getManagedClusterOutput({
    resourceName: name,
    resourceGroupName: groupName,
  });

  return aks.apply((a) => {
    if (!a.privateFQDN) return undefined;
    const dnsName = a.privateFQDN.split(":").slice(1).join(".");
    const rsGroup = a.nodeResourceGroup!;

    return {
      resourceName: dnsName,
      group: { resourceGroupName: rsGroup, location: currentRegionName },
      id: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${rsGroup}/providers/Microsoft.Network/privateDnsZones/${dnsName}`,
    } as ResourceInfo;
  });
};

export const linkAksPrivateDnzVnet = ({
  vnetId,
  name,
  groupName,
  formattedName,
}: ResourceType & { vnetId: Output<string> }) => {
  const dns = getAksPrivateDnz({ name, groupName, formattedName });
  return dns.apply((d) => {
    if (!d) return;
    return linkVnetToPrivateDns({
      name,
      group: d.group,
      zoneName: d.resourceName,
      vnetId,
    });
  });
};
