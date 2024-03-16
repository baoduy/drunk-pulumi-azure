import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import NginxIngress from './NginxIngress';
import { getRootDomainFromUrl } from '../../Common/Helpers';
import { IngressCanary, IngressClassName } from './type';
import { getTlsName } from '../CertHelper';

interface Props {
  name: string;
  namespace: Input<string>;
  ingressClass?: IngressClassName;
  host: string;

  port?: number;
  proxyUrl: string;
  proxyTlsSecretName?: string;

  certManagerIssuer?: boolean;
  canary?: IngressCanary;

  whitelistIps?: Array<Input<string>>;
  enableModSecurity?: boolean;
  cors?: string[];

  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({
  name,
  namespace,
  host,
  certManagerIssuer = true,
  cors,
  proxyUrl,
  proxyTlsSecretName,
  ingressClass,
  port,

  dependsOn,
  provider,
  ...others
}: Props) => {
  if (!port) port = proxyUrl.includes('http:') ? 80 : 443;

  const service = new k8s.core.v1.Service(
    name,
    {
      metadata: {
        name,
        namespace,
        labels: { app: name },
      },
      spec: {
        type: 'ExternalName',
        externalName: proxyUrl.replace('https://', '').replace('http://', ''),
        //externalIPs: externalIPs || undefined, //because of this issue https://github.com/coredns/coredns/issues/2324#issuecomment-484005202
        ports: [{ port }],
      },
    },
    { dependsOn, provider }
  );

  return NginxIngress({
    name,

    className: ingressClass,
    certManagerIssuer,
    hostNames: [host],

    tlsSecretName: getTlsName(getRootDomainFromUrl(host), certManagerIssuer),

    responseHeaders: { 'x-backend-service-name': name },
    cors: cors && { origins: cors },
    proxy: {
      backendProtocol: port === 80 ? 'HTTP' : 'HTTPS',
      backendUrl: proxyUrl,
      sslVerify: false,
      tlsSecretName: proxyTlsSecretName,
    },

    service,

    ...others,
    dependsOn,
    provider,
  });
};
