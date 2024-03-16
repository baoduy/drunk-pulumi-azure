import { K8sArgs } from '../types';
import * as pulumi from '@pulumi/pulumi';
import * as cf from '@pulumi/cloudflare';
import certCreator, { getCloudflareOriginCert } from './CertCreator';
import KsCertSecret from '../Core/KsCertSecret';
import { getTlsName } from '../CertHelper';
import { KeyVaultInfo } from '../../types';

export interface CloudFlareCertImportProps extends K8sArgs {
  namespaces: pulumi.Input<string>[];
  cloudflare: Array<{
    apiKey?: pulumi.Input<string>;
    provider?: cf.Provider;
    zones: string[];
    //namespaces?: pulumi.Input<string>[];
  }>;
  /**Load existing cert from Key Vault*/
  certExisted?: boolean;
  vaultInfo?: KeyVaultInfo;
}

export default async ({
  namespaces,
  cloudflare,
  certExisted,
  vaultInfo,
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
        const cert =
          certExisted && vaultInfo
            ? await getCloudflareOriginCert({ domainName: z, vaultInfo })
            : await certCreator({
                domainName: z,
                vaultInfo,
                provider: cfProvider,
              });

        // const ns = c.namespaces ?? namespaces;
        // if (!ns || !Array.isArray(ns))
        //   throw new Error(`The namespaces of ${z} is invalid.`);

        return pulumi.all([namespaces]).apply(([ns]) =>
          ns.map((n) =>
            KsCertSecret({
              name: getTlsName(z, false),
              namespace: n,
              certInfo: cert,
              ...others,
            })
          )
        );
      });
    })
  );
