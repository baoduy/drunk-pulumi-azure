import deployment from '../Deployment';
import { DefaultKsAppArgs } from '../types';
import { createPVCForStorageClass, StorageClassNameTypes } from '../Storage';

export interface UptimeKumaProps extends DefaultKsAppArgs {
  storageClassName?: StorageClassNameTypes;
}

export default ({
  namespace,
  ingress,
  storageClassName,
  ...others
}: UptimeKumaProps) => {
  const name = 'uptime-kuma';
  const image = 'louislam/uptime-kuma:latest';
  const port = 3001;

  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    storageClassName,
    ...others,
  });

  deployment({
    name,
    namespace,

    podConfig: {
      image,
      ports: { http: port },
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
      volumes: [
        {
          name: 'data',
          mountPath: '/app/data',
          subPath: 'data',
          persistentVolumeClaim: persisVolume.metadata.name,
          readOnly: false,
        },
      ],
      //securityContext: { runAsUser: 1001, runAsGroup: 1001 },
    },
    deploymentConfig: { replicas: 1 },
    ingressConfig: ingress,

    ...others,
  });
};
