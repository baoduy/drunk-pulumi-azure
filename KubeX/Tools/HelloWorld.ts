import deployment from '../Deployment';
import { DefaultKsAppArgs } from '../types';

export interface HelloWorldProps extends DefaultKsAppArgs {}

export default ({ namespace, ingress, ...others }: HelloWorldProps) => {
  const name = 'hello-world';
  const image = 'hello-world:latest';
  const port = 3000;

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
