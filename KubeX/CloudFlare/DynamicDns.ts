import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment from '../Deployment';

type CloudFlareProps = {
  apiKey: Input<string>;
  zones: Array<{
    id: Input<string>;
    aRecords: string[];
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

  const configMap: any = {};
  const secrets: any = {};

  cloudFlare.forEach((c, ci) => {
    secrets[`Cloudflare__${ci}__ApiKey`] = c.apiKey;

    c.zones.forEach((z, zi) => {
      configMap[`Cloudflare__${ci}__Zones__${zi}__Id`] = z.id;
      z.aRecords.forEach(
        (r, rI) =>
          (configMap[`Cloudflare__${ci}__Zones__${zi}__ARecords__${rI}`] = r)
      );
    });
  });

  deployment({
    name,
    namespace,

    configMap,
    secrets,

    podConfig: {
      image,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },

    ...others,
  });
};
