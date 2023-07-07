import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment from '../Deployment';
import { K8sArgs } from '../types';

export interface UptimeKumaProps extends K8sArgs {
  namespace: Input<string>;
  hostName: string;
}

export default ({ namespace, hostName, ...others }: UptimeKumaProps) => {
  const name = 'uptime-kuma';
  const image = 'louislam/uptime-kuma:latest';
  const port = 3001;

  const configMap: any = {};
  const secrets: any = {};
  //
  // cloudFlare.forEach((c, ci) => {
  //   secrets[`Cloudflare__${ci}__ApiKey`] = c.apiKey;
  //
  //   c.zones.forEach((z, zi) => {
  //     configMap[`Cloudflare__${ci}__Zones__${zi}__Id`] = z.id;
  //     z.aRecords.forEach(
  //       (r, rI) =>
  //         (configMap[`Cloudflare__${ci}__Zones__${zi}__ARecords__${rI}`] = r)
  //     );
  //   });
  // });

  deployment({
    name,
    namespace,

    configMap,
    secrets,

    podConfig: {
      image,
      port,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },
    ingressConfig: {
      type: 'nginx',
      certManagerIssuer: true,
      hostNames: [hostName],
    },

    ...others,
  });
};
