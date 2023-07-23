import deployment from '../Deployment';
import { DefaultKsAppArgs } from '../types';

export interface UptimeKumaProps extends DefaultKsAppArgs {}

export default ({ namespace, ingress, ...others }: UptimeKumaProps) => {
  const name = 'uptime-kuma';
  const image = 'louislam/uptime-kuma:latest';
  const port = 3001;
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

    podConfig: {
      image,
      port,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },
    ingressConfig: ingress,

    ...others,
  });
};
