import * as tls from '@pulumi/tls';
import { KeyVaultInfo } from '../types';
import { addCustomSecret } from '../KeyVault/CustomHelper';

export const defaultAllowedUses = [
  'cert_signing',
  'client_auth',
  'key_agreement',
  'key_encipherment',
  'server_auth',
];

export const defaultCodeSignUses = [
  'cert_signing',
  'code_signing',
  'content_commitment',
  'data_encipherment',
  'digital_signature',
  'email_protection',
  'key_agreement',
  'key_encipherment',
  'microsoft_Commercial_Code_Signing',
  'microsoft_Kernel_Code_Signing',
  'ocsp_signing',
];

export const createSelfSignCert = ({
  dnsName,
  commonName,
  organization,
  allowedUses = defaultAllowedUses,
  validYears = 3,
  vaultInfo,
}: {
  dnsName: string;
  commonName: string;
  organization: string;
  allowedUses?: string[];
  validYears?: number;
  vaultInfo?: KeyVaultInfo;
}) => {
  const vaultCertName = `${dnsName}-cert`;
  //const vaultCAName = `${dnsName}-ca`;
  const vaultPrivateKeyName = `${dnsName}-key`;

  const privateKey = new tls.PrivateKey(`${dnsName}-privateKey`, {
    algorithm: 'RSA',
    rsaBits: 4096,
  });

  const cert = new tls.SelfSignedCert(`${dnsName}-selfSignedCert`, {
    dnsNames: [dnsName],
    subject: {
      commonName,
      organization,
    },
    allowedUses,
    privateKeyPem: privateKey.privateKeyPem,
    validityPeriodHours: validYears * 365 * 24,
    earlyRenewalHours: 30 * 24,
  });

  if (vaultInfo) {
    addCustomSecret({
      name: vaultCertName,
      vaultInfo,
      value: cert.certPem,
      contentType: `${dnsName} self sign cert.`,
    });

    // addCustomSecret({
    //   name: vaultCAName,
    //   vaultInfo,
    //   value: cert.,
    //   contentType: `${dnsName} self sign ca cert.`,
    // });

    addCustomSecret({
      name: vaultPrivateKeyName,
      vaultInfo,
      value: cert.privateKeyPem,
      contentType: `${dnsName} self sign private key.`,
    });
  }

  return {
    cert: cert.certPem,
    privateKey: cert.privateKeyPem,
  };
};
