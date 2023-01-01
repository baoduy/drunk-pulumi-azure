import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment, { IngressTypes } from '../Deployment';

export interface HelloAppProps {
  namespace: Input<string>;
  provider: k8s.Provider;
  hostName: Input<string>;
  ingressType: IngressTypes;
  useVirtualHost?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default async ({
  namespace,
  hostName,
  ingressType,
  useVirtualHost,
  ...others
}: HelloAppProps) => {
  const name = 'aks-hello';
  const image = 'mcr.microsoft.com/azuredocs/aks-helloworld:v1';
  const port = 80;

  await deployment({
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
      allowHttp: !enableCertManager,
      certManagerIssuer: enableCertManager,
      tlsSecretName: enableCertManager ? `tls-${name}-lets` : undefined,
      className: enableFirewall ? 'public' : 'nginx',
    },

    ...others,
  });
};
