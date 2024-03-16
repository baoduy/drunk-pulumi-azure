import * as certificateregistration from "@pulumi/azure-native/certificateregistration";

import { DefaultResourceArgs, KeyVaultInfo } from "../types";

import creator from "../Core/ResourceCreator";
import { defaultTags } from "../Common/AzureEnv";
import { global } from "../Common";
import { getCertOrderName } from "../Common/Naming";

interface Props extends DefaultResourceArgs {
  domain: string;
  productType?: certificateregistration.CertificateProductType;
  vaultInfo?: KeyVaultInfo;
}

export default ({
  domain,
  productType = certificateregistration.CertificateProductType
    .StandardDomainValidatedWildCardSsl,
  vaultInfo,
  ...others
}: Props) => {
  const n = getCertOrderName(domain);

  const order = creator(
    certificateregistration.AppServiceCertificateOrder,
    {
      certificateOrderName: n,
      ...global.groupInfo,
      location: "global",
      productType,
      autoRenew: true,
      distinguishedName: `CN=*.${domain}`,
      keySize: 2048,
      validityInYears: 1,
      tags: defaultTags,
      ...others,
    } as certificateregistration.AppServiceCertificateOrderArgs &
      DefaultResourceArgs
  );

  if (vaultInfo) {
    new certificateregistration.AppServiceCertificateOrderCertificate(
      n,
      {
        certificateOrderName: n,
        ...global.groupInfo,
        location: "global",
        keyVaultSecretName: n,
        keyVaultId: vaultInfo.id,
      },
      { dependsOn: order.resource }
    );
  }
  return order;
};
