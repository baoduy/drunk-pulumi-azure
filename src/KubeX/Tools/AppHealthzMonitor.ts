import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment from '../Deployment';
import { getTlsName } from '../CertHelper';
import { getRootDomainFromUrl } from '../../Common/Helpers';
import { defaultDotNetConfig } from '../../Common/AppConfigs/dotnetConfig';
import IdentityCreator from '../../AzAd/Identity';
import { tenantId } from '../../Common/AzureEnv';

export interface AppHealthMonitorProps {
  name?: string;
  namespace: Input<string>;
  hostName: string;

  auth: { azureAD?: boolean };
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
  const callbackUrl = `https://${hostName}/signin-oidc`;

  const identity = auth?.azureAD
    ? IdentityCreator({
        name,

        createClientSecret: false,
        createPrincipal: false,

        appType: 'spa',
        replyUrls: [callbackUrl],
      })
    : undefined;

  const configMap: Record<string, Input<string>> = { ...defaultDotNetConfig };

  if (identity) {
    configMap['AzureAd__TenantId'] = tenantId;
    configMap['AzureAd__ClientId'] = identity?.clientId;
    configMap['AzureAd__RedirectUri'] = callbackUrl;
    configMap[
      'AzureAd__PostLogoutRedirectUri'
    ] = `https://${hostName}/signout-callback-oidc`;
  }

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
      ports: { http: 8080 },
      image,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },

    ...others,
  });
};
