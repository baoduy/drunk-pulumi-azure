import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';

import { corsDefaultHeaders, defaultResponseHeaders } from './Conts';
import { IngressProps } from './type';

export default ({
  name,
  className = 'nginx',
  hostNames,
  maxUploadSizeMb = 10,
  allowHttp,
  internalIngress,
  tlsSecretName,
  canary,
  proxy,
  auth,
  responseHeaders,
  whitelistIps,
  enableModSecurity,
  cors,
  certManagerIssuer,
  pathType = 'ImplementationSpecific',
  services,
  service,

  provider,
  dependsOn,
}: IngressProps) => {
  if (!service && !services)
    throw new Error('Either "service" or "services" is must be provided.');

  const annotations: { [key: string]: Input<string> } = {
    'pulumi.com/skipAwait': 'true',
    'nginx.ingress.kubernetes.io/body-size': '1024m',
    'nginx.ingress.kubernetes.io/client-body-buffer-size': '50m',
    'nginx.ingress.kubernetes.io/client-max-body-size': '50m',
  };

  if (maxUploadSizeMb) {
    annotations[
      'nginx.ingress.kubernetes.io/proxy-body-size'
    ] = `${maxUploadSizeMb}m`;
  }

  if (certManagerIssuer) {
    if (typeof certManagerIssuer === 'string')
      annotations['cert-manager.io/cluster-issuer'] = certManagerIssuer;
    else annotations['kubernetes.io/tls-acme'] = 'true';
  }

  if (internalIngress) {
    annotations['service.beta.kubernetes.io/azure-load-balancer-internal'] =
      'true';
  }

  if (canary) {
    annotations['nginx.ingress.kubernetes.io/canary'] = 'true';
    annotations['nginx.ingress.kubernetes.io/canary-weight'] = '100';

    if (canary.headerKey)
      annotations['nginx.ingress.kubernetes.io/canary-by-header'] =
        canary.headerKey;
    if (canary.headerValue)
      annotations['nginx.ingress.kubernetes.io/canary-by-header-value'] =
        canary.headerValue;
    if (canary.headerPattern)
      annotations['nginx.ingress.kubernetes.io/canary-by-header-pattern'] =
        canary.headerPattern;
  }

  if (proxy?.backendProtocol) {
    //annotations['nginx.ingress.kubernetes.io/ssl-passthrough'] = 'true';
    annotations['nginx.ingress.kubernetes.io/backend-protocol'] =
      proxy.backendProtocol;
  }

  if (proxy?.backendUrl) {
    const vhost = proxy.backendUrl
      .replace('https://', '')
      .replace('http://', '');

    annotations['nginx.ingress.kubernetes.io/upstream-vhost'] = vhost;
    annotations[
      'nginx.ingress.kubernetes.io/server-snippet'
    ] = `proxy_ssl_name ${vhost};proxy_ssl_server_name on`;

    annotations['nginx.ingress.kubernetes.io/use-proxy-protocol'] = 'true';
    annotations['nginx.ingress.kubernetes.io/proxy-ssl-verify'] =
      proxy.sslVerify ? 'on' : 'off';
    annotations['nginx.ingress.kubernetes.io/proxy-ssl-verify-depth'] = '1';
    annotations['nginx.ingress.kubernetes.io/proxy-connect-timeout'] = '3600';
    annotations['nginx.ingress.kubernetes.io/proxy-read-timeout'] = '3600';
    annotations['nginx.ingress.kubernetes.io/proxy-send-timeout'] = '3600';

    if (proxy.tlsSecretName) {
      annotations['nginx.ingress.kubernetes.io/proxy-ssl-secret'] =
        proxy.tlsSecretName;
    }
  }

  if (auth?.enableClientTls === true) {
    // Enable client certificate authentication
    annotations['nginx.ingress.kubernetes.io/auth-tls-verify-client'] =
      auth.alwaysRequireCert ? 'on' : 'optional';
    // Create the secret containing the trusted ca certificates
    if (auth.caSecret)
      annotations['nginx.ingress.kubernetes.io/auth-tls-secret'] =
        auth.caSecret;
    // Specify the verification depth in the client certificates chain
    annotations['nginx.ingress.kubernetes.io/auth-tls-verify-depth'] = '1';
    // Specify an error page to be redirected to verification errors
    if (auth.errorPage)
      annotations['nginx.ingress.kubernetes.io/auth-tls-error-page'] =
        auth.errorPage;
    // Specify if certificates are passed to upstream server
    annotations[
      'nginx.ingress.kubernetes.io/auth-tls-pass-certificate-to-upstream'
    ] = 'true';
    annotations[
      'nginx.ingress.kubernetes.io/auth-tls-pass-certificate-to-upstream-header'
    ] = auth.upstreamHeaderKey ?? 'ssl-client-cert';
  }

  const responseSecurity: { [key: string]: string } | undefined =
    responseHeaders === true
      ? defaultResponseHeaders
      : responseHeaders === false
      ? undefined
      : {
          ...defaultResponseHeaders,
          ...responseHeaders,
        };

  if (responseSecurity) {
    annotations[
      'nginx.ingress.kubernetes.io/configuration-snippet'
    ] = `${Object.keys(responseSecurity)
      .map((k) => `more_set_headers "${k}: ${responseSecurity[k]}";`)
      .join('')}`;
  }

  //Force Https
  annotations['kubernetes.io/ingress.allow-http'] = allowHttp
    ? 'true'
    : 'false';
  annotations['ingress.kubernetes.io/force-ssl-redirect'] = allowHttp
    ? 'false'
    : 'true';

  if (cors) {
    annotations['nginx.ingress.kubernetes.io/cors-allow-origin'] =
      cors.origins.join(',');

    annotations['nginx.ingress.kubernetes.io/cors-allow-headers'] = cors.headers
      ? corsDefaultHeaders + ',' + cors.headers.join(',')
      : corsDefaultHeaders;
  }
  //Whitelist IP Address
  if (whitelistIps && whitelistIps.length > 0) {
    annotations['nginx.ingress.kubernetes.io/whitelist-source-range'] =
      whitelistIps.join(',');
  }

  //Mode Security
  if (enableModSecurity) {
    annotations['nginx.ingress.kubernetes.io/enable-owasp-core-rules'] = 'true';
    annotations['nginx.ingress.kubernetes.io/enable-modsecurity'] = 'true';
    annotations['nginx.ingress.kubernetes.io/modsecurity-transaction-id'] =
      '$request_id';
    // annotations[
    //   'nginx.ingress.kubernetes.io/modsecurity-snippet'
    // ] = `Include /etc/nginx/owasp-modsecurity-crs/nginx-modsecurity.conf`;
  } else {
    annotations['nginx.ingress.kubernetes.io/enable-owasp-core-rules'] =
      'false';
    annotations['nginx.ingress.kubernetes.io/enable-modsecurity'] = 'false';
  }

  if (services) {
    annotations['nginx.ingress.kubernetes.io/rewrite-target'] = '/$1';
    annotations['nginx.ingress.kubernetes.io/use-regex'] = 'true';
  }

  const servicePaths = services
    ? services.paths.map((s) => ({
        backend: {
          service: {
            name: s.metadata.name,
            port: {
              number: s.spec.ports[0].port,
            },
          },
        },
        path: `${s.path}/(.*)`,
        pathType,
      }))
    : [
        {
          backend: {
            service: {
              name: service.metadata.name,
              port: {
                number: service.spec.ports[0].port,
                name: service.spec.ports[0].port
                  ? undefined
                  : service.spec.ports[0].name,
              },
            },
          },
          path: '/',
          pathType, //Prefix or ImplementationSpecific
        },
      ];

  return new k8s.networking.v1.Ingress(
    name,
    {
      metadata: {
        name,
        namespace: services?.metadata.namespace || service?.metadata.namespace,
        labels: services?.metadata.labels || service?.metadata.labels,
        annotations,
      },
      spec: {
        ingressClassName: className,
        rules: hostNames.map((hostName) => ({
          host: hostName,
          http: { paths: servicePaths },
        })),
        tls: allowHttp
          ? undefined
          : [
              {
                hosts: hostNames,
                secretName: tlsSecretName,
              },
            ],
      },
    },
    { provider, dependsOn }
  );
};
