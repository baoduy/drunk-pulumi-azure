import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment, { IngressTypes } from '../Deployment';

export interface HelloAppProps {
  namespace: Input<string>;
  provider: k8s.Provider;
  hostName: Input<string>;
  allowHttp?: boolean;
  ingressType: IngressTypes;
  useVirtualHost?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({
  namespace,
  hostName,
  ingressType,
  allowHttp,
  useVirtualHost,
  ...others
}: HelloAppProps) => {
  const name = 'aks-hello';
  const image = 'mcr.microsoft.com/azuredocs/aks-helloworld:v1';
  const port = 80;

  deployment({
    name,
    namespace,

    podConfig: {
      port,
      image,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1, useVirtualHost },

    ingressConfig: {
      type: ingressType,
      hostNames: [hostName],
      allowHttp,
      certManagerIssuer: !allowHttp,
      tlsSecretName: allowHttp ? undefined : `tls-${name}-lets`,
      className: 'nginx',
    },

    ...others,
  });
};
