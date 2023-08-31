import * as tls_self_signed_cert from '@pulumi/tls-self-signed-cert';
import { KeyVaultInfo } from '../types';
import { addCustomSecret } from '../KeyVault/CustomHelper';

export const createSelfSignCert = ({
  dnsName,
  commonName,
  organization,
  validYears = 3,
  vaultInfo,
}: {
  dnsName: string;
  commonName: string;
  organization: string;
  validYears?: number;
  vaultInfo?: KeyVaultInfo;
}) => {
  const vaultCertName = `${dnsName}-cert`;
  const vaultCAName = `${dnsName}-ca`;
  const vaultPrivateKeyName = `${dnsName}-key`;

  const cert = new tls_self_signed_cert.SelfSignedCertificate('cert', {
    dnsName,
    validityPeriodHours: validYears * 365 * 24,
    localValidityPeriodHours: validYears * 365 * 24,
    subject: {
      commonName,
      organization,
    },
  });

  if (vaultInfo) {
    addCustomSecret({
      name: vaultCertName,
      vaultInfo,
      value: cert.pem,
      contentType: `${dnsName} self sign cert.`,
    });

    addCustomSecret({
      name: vaultCAName,
      vaultInfo,
      value: cert.caCert,
      contentType: `${dnsName} self sign ca cert.`,
    });

    addCustomSecret({
      name: vaultPrivateKeyName,
      vaultInfo,
      value: cert.privateKey,
      contentType: `${dnsName} self sign private key.`,
    });
  }

  return {
    cert: cert.pem,
    ca: cert.caCert,
    privateKey: cert.privateKey,
  };
};
