import { K8sArgs } from '../types';
import * as pulumi from '@pulumi/pulumi';
import * as cf from '@pulumi/cloudflare';
import certCreator from './CertCreator';
import KsCertSecret from '../Core/KsCertSecret';
import { getTlsName } from '../CertHelper';

export interface CloudFlareCertImportProps extends K8sArgs {
  namespaces: pulumi.Input<string>[];
  cloudflare: Array<{
    apiKey?: pulumi.Input<string>;
    provider?: cf.Provider;
    zones: string[];
  }>;
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
      const cert = certCreator({ domainName: z, provider: cfProvider });

      return pulumi
        .all([namespaces, cert.cert, cert.privateKey])
        .apply(([ns, cert, privateKey]) =>
          ns.map((n) =>
            KsCertSecret({
              name: getTlsName(z, false),
              namespace: n,
              cert: cert,
              privateKey: cert,
              ...others,
            })
          )
        );
    });
  });
