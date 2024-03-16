import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import deployment from '../Deployment';

type CloudFlareProps = {
  apiKey: Input<string>;
  zones: Array<{
    id: Input<string>;
    proxied?: boolean;
    aRecords: Array<{ name: string; proxied?: boolean }>;
  }>;
};

export interface DynamicDnsProps {
  namespace: Input<string>;
  cloudFlare: Array<CloudFlareProps>;

  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({
  namespace,
  cloudFlare = [],

  ...others
}: DynamicDnsProps) => {
  const name = 'cloudflare-ddns';
  const image = 'baoduy2412/cloudflare-ddns:latest';

  const configMap: Record<string, Input<string>> = {};
  const secrets: Record<string, Input<string>> = {};

  cloudFlare.forEach((c, ci) => {
    secrets[`Cloudflare__${ci}__ApiKey`] = c.apiKey;

    c.zones.forEach((z, zi) => {
      configMap[`Cloudflare__${ci}__Zones__${zi}__Id`] = z.id;

      if (z.proxied)
        configMap[`Cloudflare__${ci}__Zones__${zi}__Proxied`] = z.proxied
          ? 'true'
          : 'false';

      z.aRecords.forEach((r, rI) => {
        configMap[`Cloudflare__${ci}__Zones__${zi}__ARecords__${rI}__Name`] =
          r.name;

        if (r.proxied)
          configMap[
            `Cloudflare__${ci}__Zones__${zi}__ARecords__${rI}__Proxied`
          ] = r.proxied ? 'true' : 'false';
      });
    });
  });

  deployment({
    name,
    namespace,

    configMap,
    secrets,

    podConfig: {
      ports: { http: 8080 },
      image,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },

    ...others,
  });
};
