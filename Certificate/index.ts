import * as tls_self_signed_cert from '@pulumi/tls-self-signed-cert';

export const createSelfSignCert = ({
  dnsName,
  commonName,
  organization,
  validYears = 3,
}: {
  dnsName: string;
  commonName: string;
  organization: string;
  validYears?: number;
}) => {
  const cert = new tls_self_signed_cert.SelfSignedCertificate('cert', {
    dnsName,
    validityPeriodHours: validYears * 365 * 24,
    localValidityPeriodHours: validYears * 365 * 24,
    subject: {
      commonName,
      organization,
    },
  });

  return {
    cert: cert.pem,
    ca: cert.caCert,
    privateKey: cert.privateKey,
  };
};
