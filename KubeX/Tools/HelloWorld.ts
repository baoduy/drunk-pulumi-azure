import deployment from '../Deployment';
import { DefaultKsAppArgs } from '../types';

export interface HelloWorldProps extends DefaultKsAppArgs {}

export default ({ namespace, ingress, ...others }: HelloWorldProps) => {
  const name = 'hello-world';
  const image = 'strm/helloworld-http';
  const port = 80;

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
