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

export default async ({
  namespaces,
  cloudflare,
  ...others
}: CloudFlareCertImportProps) =>
  await Promise.all(
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

      return c.zones.map(async (z) => {
        const cert = await certCreator({ domainName: z, provider: cfProvider });

        return pulumi
          .all([namespaces, cert.cert, cert.privateKey, cert.ca])
          .apply(([ns, cert, privateKey, ca]) =>
            ns.map((n) =>
              KsCertSecret({
                name: getTlsName(z, false),
                namespace: n,
                cert,
                ca,
                privateKey,
                ...others,
              })
            )
          );
      });
    })
  );
