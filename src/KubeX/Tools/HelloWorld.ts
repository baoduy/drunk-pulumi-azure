import deployment from '../Deployment';
import { DefaultKsAppArgs } from '../types';

export default ({ namespace, ingress, ...others }: DefaultKsAppArgs) => {
  const name = 'hello-world';
  const image = 'strm/helloworld-http';
  const port = 80;

  deployment({
    name,
    namespace,

    podConfig: {
      image,
      ports: { http: port },
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },
    ingressConfig: ingress,

    ...others,
  });
};
