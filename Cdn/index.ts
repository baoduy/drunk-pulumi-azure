import { BasicResourceArgs, KeyVaultInfo, ResourceGroupInfo } from "../types";
import * as cdn from "@pulumi/azure-native/cdn";
import * as azureAd from "@pulumi/azuread";
import { getCdnProfileName } from "../Common/Naming";
import { global } from "../Common";
import { defaultTags } from "../Common/AzureEnv";
import {
  grantVaultAccessPolicy,
  grantVaultRbacPermission,
} from "../KeyVault/VaultPermissions";

interface Props {
  name: string;
  group?: ResourceGroupInfo;
  vaultAccess?: {
    enableRbacAccess?: boolean;
    vaultInfo: KeyVaultInfo;
  };
}

export default async ({
  name,
  group = global.groupInfo,
  vaultAccess,
}: Props) => {
  name = getCdnProfileName(name);

  const profile = new cdn.Profile(name, {
    profileName: name,
    ...group,
    location: "global",
    sku: { name: cdn.SkuName.Standard_Microsoft },
    tags: defaultTags,
  });

  if (vaultAccess) {
    //https://docs.microsoft.com/en-us/azure/cdn/cdn-custom-ssl?tabs=option-2-enable-https-with-your-own-certificate
    const n = `${name}-sp`;

    const sp = new azureAd.ServicePrincipal(n, {
      applicationId: "205478c0-bd83-4e1b-a9d6-db63a3e1e1c8",
    });

    if (vaultAccess.enableRbacAccess) {
      await grantVaultRbacPermission({
        name: n,
        objectId: sp.objectId,
        permission: "ReadOnly",
        applicationId: sp.applicationId,
        principalType: "ServicePrincipal",
        scope: vaultAccess.vaultInfo.id,
      });
    } else
      grantVaultAccessPolicy({
        name: n,
        objectId: sp.objectId,
        permission: "ReadOnly",
        applicationId: sp.applicationId,
        principalType: "ServicePrincipal",
        vaultInfo: vaultAccess.vaultInfo,
      });
  }

  return profile;
};
