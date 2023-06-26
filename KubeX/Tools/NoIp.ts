import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment, { IngressTypes } from '../Deployment';

export interface NoIpProps {
  namespace: Input<string>;
  username: Input<string>;
  password: Input<string>;
  domain: Input<string>;
  interval?: number;
  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({
  namespace,
  username,
  password,
  domain,
  interval = 5,
  ...others
}: NoIpProps) => {
  const name = 'no-ip';
  const image = 'aanousakis/no-ip:v1';

  deployment({
    name,
    namespace,

    configMap: {
      INTERVAL: interval.toString(),
      DOMAINS: domain,
    },
    secrets: { USERNAME: username, PASSWORD: password },

    podConfig: {
      image,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },

    ...others,
  });
};
