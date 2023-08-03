import deployment from '../Deployment';
import { DefaultKsAppArgs } from '../types';
import { createPVCForStorageClass } from '../Storage';

export interface UptimeKumaProps extends DefaultKsAppArgs {}

export default ({ namespace, ingress, ...others }: UptimeKumaProps) => {
  const name = 'uptime-kuma';
  const image = 'louislam/uptime-kuma:latest';
  const port = 3001;

  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    ...others,
  });

  deployment({
    name,
    namespace,

    podConfig: {
      image,
      port,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
      volumes: [
        {
          name: 'data',
          mountPath: '/app/data',
          persistentVolumeClaim: persisVolume.metadata.name,
          readOnly: false,
        },
      ],
    },
    deploymentConfig: { replicas: 1 },
    ingressConfig: ingress,

    ...others,
  });
};
