import * as tls from '@pulumi/tls';
import fs from 'fs';
import * as pem from './p12';
import { KeyVaultInfo } from '../types';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import forge from 'node-forge';

export const defaultAllowedUses = [
  'data_encipherment',
  'digital_signature',
  'cert_signing',
  'client_auth',
  'key_agreement',
  'key_encipherment',
  'server_auth',
  'timestamping',
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
    rsaBits: 2048,
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
      value: privateKey.privateKeyPem,
      contentType: `${dnsName} self sign private key.`,
    });
  }

  return {
    cert: cert.certPem,
    privateKey: privateKey.privateKeyPem,
  };
};

export const convertPfxFileToPem = async ({
  certPath,
  password,
}: {
  certPath: string;
  password?: string;
}) => {
  const p12File = await fs.promises.readFile(certPath, { encoding: 'binary' });
  const cert = pem.convertToPem(p12File, password);

  console.log('Loaded P12 file', certPath);
  return { cert: cert.pemCertificate, privateKey: cert.pemKey };
};

export const convertPfxToPem = ({
  base64Cert,
  password,
}: {
  base64Cert: string;
  password?: string;
}) => {
  const byteArray = Buffer.from(base64Cert, 'base64');
  const cert = pem.convertToPem(byteArray.toString('binary'), password);

  console.log('Loaded P12 base64');
  return { cert: cert.pemCertificate, privateKey: cert.pemKey };
};
