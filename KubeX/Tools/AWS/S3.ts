import deployment from '../../Deployment';
import { DefaultKsAppArgs } from '../../types';
import { createPVCForStorageClass, StorageClassNameTypes } from '../../Storage';

export interface AwsS3Props extends Omit<DefaultKsAppArgs, 'name'> {
  storageClassName: StorageClassNameTypes;
}

export default ({
  namespace,
  ingress,
  storageClassName,
  ...others
}: AwsS3Props) => {
  const name = 'aws-s3';
  const image = 'scireum/s3-ninja:latest';

  //Storage
  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    accessMode: 'ReadWriteMany',
    ...others,
    storageClassName,
  });

  deployment({
    name,
    namespace,

    podConfig: {
      port: 9000,
      image,
      resources: {
        requests: { memory: '1Mi', cpu: '1m' },
        limits: {
          memory: '1Gi',
          cpu: '1',
        },
      },
      volumes: [
        {
          name: 'data',
          mountPath: '/home/sirius/data',
          subPath: 'sample',
          persistentVolumeClaim: persisVolume.metadata.name,
        },
      ],
    },
    ingressConfig: ingress,
    deploymentConfig: { replicas: 1 },

    ...others,
  });
};
