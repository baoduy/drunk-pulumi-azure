import * as tls from '@pulumi/tls';
import { organization } from '../../Common/StackEnv';
import * as cf from '@pulumi/cloudflare';
import { KeyVaultInfo } from '../../types';
import { addCustomSecret } from '../../KeyVault/CustomHelper';
import { getSecret } from '../../KeyVault/Helper';

export interface CloudFlareCertCreatorProps {
  domainName: string;
  vaultInfo?: KeyVaultInfo;
  provider: cf.Provider;
  lock?: boolean;
}

const getVaultNames = (domainName: string) => ({
  privateKeyName: `cloudflare-${domainName}-privateKey`,
  certName: `cloudflare-${domainName}-cert`,
  caName: `cloudflare-${domainName}-ca`,
});

export const getCloudflareOriginCert = async ({
  domainName,
  vaultInfo,
}: Pick<Required<CloudFlareCertCreatorProps>, 'domainName' | 'vaultInfo'>) => {
  const vaultNames = getVaultNames(domainName);

  const cert = await getSecret({
    name: vaultNames.certName,
    vaultInfo,
  });
  const ca = await getSecret({
    name: vaultNames.caName,
    vaultInfo,
  });
  const pk = await getSecret({
    name: vaultNames.privateKeyName,
    vaultInfo,
  });

  return {
    privateKey: pk!.value!,
    cert: cert!.value!,
    ca: ca!.value!,
  };
};

export default async ({
  domainName,
  provider,
  vaultInfo,
  lock = true,
}: CloudFlareCertCreatorProps) => {
  const vaultNames = getVaultNames(domainName);
  const algorithm = 'RSA';

  //create new private key
  const privateKey = new tls.PrivateKey(`${domainName}_private_key`, {
    algorithm,
  });

  //create new CSR
  const csr = new tls.CertRequest(`${domainName}_csr`, {
    privateKeyPem: privateKey.privateKeyPem,
    subject: {
      commonName: domainName,
      organization,
    },
    dnsNames: [domainName],
  });

  //Create a new Cert
  const cert = new cf.OriginCaCertificate(
    `${domainName}_original_cert`,
    {
      csr: csr.certRequestPem,
      hostnames: [domainName, `*.${domainName}`, `www.${domainName}`],
      requestType: 'origin-rsa',
      requestedValidity: 5475,
    },
    { provider, protect: lock }
  );

  //Get CA cert
  const ca = await cf.getOriginCaRootCertificate(
    {
      algorithm,
    },
    { provider }
  );

  //Store to vault
  if (vaultInfo) {
    addCustomSecret({
      name: vaultNames.privateKeyName,
      value: privateKey.privateKeyPem,
      contentType: `cloudflare ${domainName} privateKey`,
      vaultInfo,
    });
    addCustomSecret({
      name: vaultNames.certName,
      value: cert.certificate,
      contentType: `cloudflare ${domainName} certificate`,
      vaultInfo,
    });
    addCustomSecret({
      name: vaultNames.caName,
      value: ca.certPem,
      contentType: `cloudflare ${domainName} CA`,
      vaultInfo,
    });
  }

  //return results
  return {
    privateKey: privateKey.privateKeyPem,
    cert: cert.certificate,
    ca: ca.certPem,
  };
};
