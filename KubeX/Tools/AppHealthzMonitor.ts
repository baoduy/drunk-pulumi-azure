import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment, { IngressTypes } from '../Deployment';
import { getTlsName } from '../CertHelper';
import { getRootDomainFromUrl } from '../../Common/Helpers';

export interface AppHealthMonitorProps {
  name?: string;
  namespace: Input<string>;
  hostName: string;

  auth: { tenantId: Input<string>; clientId: Input<string> };
  endpoints?: Array<{ name: Input<string>; uri: Input<string> }>;

  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({
  name = 'healthz-monitor',
  namespace,
  hostName,

  auth,
  endpoints = [],

  ...others
}: AppHealthMonitorProps) => {
  const image = 'baoduy2412/healthz-ui:latest';

  const configMap: any = {};

  configMap['AzureAd__TenantId'] = auth.tenantId;
  configMap['AzureAd__ClientId'] = auth.clientId;

  endpoints.forEach((e, i) => {
    configMap[`HealthChecksUI__HealthChecks__${i}__Name`] = e.name;
    configMap[`HealthChecksUI__HealthChecks__${i}__Uri`] = e.uri;
  });

  deployment({
    name,
    namespace,
    configMap,

    ingressConfig: {
      type: 'nginx',
      className: 'nginx',
      hostNames: [hostName],
      certManagerIssuer: true,
      tlsSecretName: getTlsName(getRootDomainFromUrl(hostName), true),
    },

    podConfig: {
      image,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },

    ...others,
  });
};
