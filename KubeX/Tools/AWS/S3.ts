import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment from '../../Deployment';

export interface AwsS3Props {
  namespace: Input<string>;
  domain: string;
  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({ namespace, domain, ...others }: AwsS3Props) => {
  const name = 'aws-s3';
  const image = 'scireum/s3-ninja:latest';

  deployment({
    name,
    namespace,

    podConfig: {
      port: 9000,
      image,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    ingressConfig: {
      type: 'nginx',
      certManagerIssuer: true,
      hostNames: [`s3.${domain}`],
    },
    deploymentConfig: { replicas: 1 },

    ...others,
  });
};
