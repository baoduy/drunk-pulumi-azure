import { KeyVaultInfo, ResourceGroupInfo, ResourceInfo } from "../types";
import * as cdn from "@pulumi/azure-native/cdn";
import * as azureAd from "@pulumi/azuread";
import { getCdnProfileName } from "../Common/Naming";
import { global } from "../Common";

interface Props {
  name: string;
  group?: ResourceGroupInfo;
  // vaultAccess?: {
  //   enableRbacAccess?: boolean;
  //   vaultInfo: KeyVaultInfo;
  // };
}

export default ({
  name,
  group = global.groupInfo,
  //vaultAccess,
}: Props): ResourceInfo => {
  name = getCdnProfileName(name);
  const internalGroup = { ...group, location: "global" };

  const profile = new cdn.Profile(name, {
    profileName: name,
    ...internalGroup,
    sku: { name: cdn.SkuName.Standard_Microsoft },
  });

  // if (vaultAccess) {
  //   //https://docs.microsoft.com/en-us/azure/cdn/cdn-custom-ssl?tabs=option-2-enable-https-with-your-own-certificate
  //   const n = `${name}-sp`;
  //
  //   new azureAd.ServicePrincipal(n, {
  //     clientId: "205478c0-bd83-4e1b-a9d6-db63a3e1e1c8",
  //   });
  // }

  return {
    resourceName: name,
    group: internalGroup,
    id: profile.id,
    instance: profile,
  };
};
