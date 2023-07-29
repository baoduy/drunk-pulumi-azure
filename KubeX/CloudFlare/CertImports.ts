import { K8sArgs } from '../types';
import { Input } from '@pulumi/pulumi';
import * as cf from '@pulumi/cloudflare';
import * as tls from '@pulumi/tls';
import { organization } from '../../Common/StackEnv';
import * as console from 'console';

export interface CloudFlareCertImportProps extends K8sArgs {
  namespaces: Input<string>[];
  cloudflare: [
    { apiKey?: Input<string>; provider?: cf.Provider; zones: string[] }
  ];
}

export default ({
  namespaces,
  cloudflare,
  ...others
}: CloudFlareCertImportProps) =>
  cloudflare.map((c, i) => {
    if (!c.apiKey && !c.provider)
      throw new Error(
        'Either CloudFlare API Key or Provider must be provided.'
      );

    const cfProvider =
      c.provider ??
      new cf.Provider(`cloudflare_${i}`, {
        apiToken: c.apiKey,
      });

    return c.zones.map((z) => {
      const privateKey = new tls.PrivateKey(`${z}_private_key`, {
        algorithm: 'RSA',
      });

      const csr = new tls.CertRequest(`${z}_csr`, {
        privateKeyPem: privateKey.privateKeyPem,
        subject: {
          commonName: z,
          organization,
        },
        dnsNames: [z],
      });

      const cert = new cf.OriginCaCertificate(
        z,
        {
          csr: csr.certRequestPem,
          hostnames: [z, `*.${z}`, `www.${z}`],
          requestType: 'origin-rsa',
          requestedValidity: 5475,
        },
        { provider: cfProvider }
      );
    });
  });
