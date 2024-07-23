import * as tls from '@pulumi/tls';
import * as fs from 'fs';
import * as pem from './p12';
import { KeyVaultInfo } from '../types';
import { addCustomSecret } from '../KeyVault/CustomHelper';

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

export const createSelfSignCertWithCA = ({
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
  const vaultCAName = `${dnsName}-ca`;
  const vaultPrivateKeyName = `${dnsName}-key`;
  const validityPeriodHours = validYears * 365 * 24;

  // Create a private key
  const privateKey = new tls.PrivateKey(vaultCertName, {
    algorithm: 'RSA',
    rsaBits: 2048,
  });

  // Create a certificate authority
  const ca = new tls.SelfSignedCert(vaultCAName, {
    dnsNames: [dnsName],
    subject: {
      commonName,
      organization,
    },
    allowedUses,
    isCaCertificate: true,
    privateKeyPem: privateKey.privateKeyPem,
    validityPeriodHours,
    earlyRenewalHours: 30 * 24,
  });

  //Create Cert Request
  const certRequest = new tls.CertRequest(`${dnsName}-cert-request`, {
    dnsNames: [dnsName],
    subject: {
      commonName,
      organization,
    },
    privateKeyPem: privateKey.privateKeyPem,
  });

  // Create a local certificate signed by the certificate authority
  const cert = new tls.LocallySignedCert(vaultCertName, {
    certRequestPem: certRequest.certRequestPem,
    caPrivateKeyPem: ca.privateKeyPem,
    caCertPem: ca.certPem,
    validityPeriodHours,
    isCaCertificate: false,
    allowedUses: ['key_encipherment', 'digital_signature', 'server_auth'],
  });

  if (vaultInfo) {
    addCustomSecret({
      name: vaultCertName,
      vaultInfo,
      value: cert.certPem,
      contentType: `${dnsName} self sign cert.`,
    });

    addCustomSecret({
      name: vaultCAName,
      vaultInfo,
      value: ca.certPem,
      contentType: `${dnsName} self sign ca cert.`,
    });

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
    ca: ca.certPem,
  };
};

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
  const vaultPrivateKeyName = `${dnsName}-key`;
  const validityPeriodHours = validYears * 365 * 24;

  // Create a private key
  const privateKey = new tls.PrivateKey(vaultCertName, {
    algorithm: 'RSA',
    rsaBits: 2048,
  });

  // Create a certificate authority
  const cert = new tls.SelfSignedCert(vaultCertName, {
    dnsNames: [dnsName],
    subject: {
      commonName,
      organization,
    },
    allowedUses,
    isCaCertificate: false,
    privateKeyPem: privateKey.privateKeyPem,
    validityPeriodHours,
    earlyRenewalHours: 30 * 24,
  });

  if (vaultInfo) {
    addCustomSecret({
      name: vaultCertName,
      vaultInfo,
      value: cert.certPem,
      contentType: `${dnsName} self sign cert.`,
    });

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
    ca: undefined,
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
  return { cert: cert.pemCertificate, privateKey: cert.pemKey };
};
