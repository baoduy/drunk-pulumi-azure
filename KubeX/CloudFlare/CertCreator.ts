import * as tls from '@pulumi/tls';
import { organization } from '../../Common/StackEnv';
import * as cf from '@pulumi/cloudflare';

export interface CloudFlareCertCreatorProps {
  domainName: string;
  provider: cf.Provider;
}

export default ({ domainName, provider }: CloudFlareCertCreatorProps) => {
  const privateKey = new tls.PrivateKey(`${domainName}_private_key`, {
    algorithm: 'RSA',
  });

  const csr = new tls.CertRequest(`${domainName}_csr`, {
    privateKeyPem: privateKey.privateKeyPem,
    subject: {
      commonName: domainName,
      organization,
    },
    dnsNames: [domainName],
  });

  const cert = new cf.OriginCaCertificate(
    `${domainName}_original_cert`,
    {
      csr: csr.certRequestPem,
      hostnames: [domainName, `*.${domainName}`, `www.${domainName}`],
      requestType: 'origin-rsa',
      requestedValidity: 5475,
    },
    { provider }
  );

  return { privateKey: privateKey.privateKeyPem, cert: cert.certificate };
};
