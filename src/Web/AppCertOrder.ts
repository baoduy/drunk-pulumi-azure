import * as cert from '@pulumi/azure-native/certificateregistration';
import { BasicResourceArgs, KeyVaultInfo } from '../types';
import { getCertOrderName, global } from '../Common';

interface Props extends BasicResourceArgs {
  domain: string;
  productType?: cert.CertificateProductType;
  vaultInfo?: KeyVaultInfo;
}

export default ({
  domain,
  productType = cert.CertificateProductType.StandardDomainValidatedWildCardSsl,
  vaultInfo,
  ...others
}: Props) => {
  const n = getCertOrderName(domain);

  const order = new cert.AppServiceCertificateOrder(n, {
    certificateOrderName: n,
    ...global.groupInfo,
    location: 'global',
    productType,
    autoRenew: true,
    distinguishedName: `CN=*.${domain}`,
    keySize: 2048,
    validityInYears: 1,
    ...others,
  });

  if (vaultInfo) {
    new cert.AppServiceCertificateOrderCertificate(
      n,
      {
        certificateOrderName: n,
        ...global.groupInfo,
        location: 'global',
        keyVaultSecretName: n,
        keyVaultId: vaultInfo.id,
      },
      { dependsOn: order },
    );
  }
  return order;
};
