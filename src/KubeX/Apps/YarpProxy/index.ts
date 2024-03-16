import { DefaultKsAppArgs } from '../../types';
import { KeyVaultInfo } from '../../../types';
import Deployment from '../../Deployment';
import { defaultDotNetConfig } from '../../../Common/AppConfigs/dotnetConfig';
import { ForwardedProxy, ReverseProxy } from './type';
import VariableResolver from '../../VairableResolvers';
import { Input } from '@pulumi/pulumi';

interface Props extends DefaultKsAppArgs {
  reverseProxy?: ReverseProxy;
  forwardedProxy?: ForwardedProxy[];
  vaultInfo?: KeyVaultInfo;
  enableHA?: boolean;
  enableDebug?: boolean;
}

const createReverseProxyConfig = async (
  reverseProxy: ReverseProxy,
  vaultInfo?: KeyVaultInfo
) => {
  const clusterConfig: Record<string, Input<string>> = {};
  const routeConfig: Record<string, Input<string>> = {};
  let routeIndex = 0;

  reverseProxy.clusters.forEach((c, i) => {
    const clusterIndex = i + 1;
    const clusterName = `cluster${clusterIndex}`;
    const urls = Array.isArray(c.destinationUrl)
      ? c.destinationUrl
      : [c.destinationUrl];

    if (c.loadBalancingPolicy) {
      clusterConfig[
        `ReverseProxy__Clusters__${clusterName}__LoadBalancingPolicy`
      ] = c.loadBalancingPolicy;
    }

    urls.forEach((url, i) => {
      clusterConfig[
        `ReverseProxy__Clusters__${clusterName}__Destinations__destination${i}__Address`
      ] = url;
    });
    c.routes.forEach((r) => {
      routeIndex += 1;
      const routeName = `ReverseProxy__Routes__route${routeIndex}`;

      routeConfig[`${routeName}__ClusterId`] = clusterName;
      routeConfig[`${routeName}__Match__Path`] = r.path;

      if (r.headers) {
        r.headers.forEach((h, headerIndex) => {
          routeConfig[`${routeName}__Match__Headers__${headerIndex}__Name`] =
            h.name;
          routeConfig[`${routeName}__Match__Headers__${headerIndex}__Mode`] =
            h.mode;
          h.values.forEach((v, valueIndex) => {
            routeConfig[
              `${routeName}__Match__Headers__${headerIndex}__Values__${valueIndex}`
            ] = v;
          });
        });
      }

      if (r.transforms) {
        r.transforms.forEach((ts: any, i) =>
          Object.keys(ts).forEach(
            (k) =>
              (routeConfig[`${routeName}__Transforms__${i}__${k}`] =
                ts[k].toString())
          )
        );
      }
    });
  });

  if (vaultInfo)
    return await VariableResolver({
      config: { ...routeConfig, ...clusterConfig },
      vaultInfo,
    });
  return { configMap: { ...routeConfig, ...clusterConfig }, secrets: {} };
};

const createForwardedProxyConfig = async (
  forwarderProxy: ForwardedProxy[],
  vaultInfo?: KeyVaultInfo
) => {
  const config: Record<string, Input<string>> = {};

  forwarderProxy.forEach((c, i) => {
    config[`ForwarderProxy__${i}__Route`] = c.route;

    c.destinationUrls.forEach(
      (d, di) => (config[`ForwarderProxy__${i}__Destinations__${di}`] = d)
    );

    if (c.headers) {
      Object.keys(c.headers).forEach((k) => {
        config[`ForwarderProxy__${i}__Headers__${k}`] = c.headers![k];
      });
    }
    if (c.sslProtocols) {
      config[`ForwarderProxy__${i}__SslProtocols`] = c.sslProtocols;
    }

    if (c.clientCertificate) {
      config[`ForwarderProxy__${i}__ClientCertificate`] = c.clientCertificate;
      if (c.clientCertificatePassword)
        config[`ForwarderProxy__${i}__ClientCertificatePassword`] =
          c.clientCertificatePassword;
    }
  });

  if (vaultInfo) return await VariableResolver({ config, vaultInfo });
  return { configMap: config, secrets: {} };
};

/** YARP Reverse Proxy https://microsoft.github.io/reverse-proxy */
export default async ({
  reverseProxy,
  forwardedProxy,
  namespace,
  ingress,
  name = 'proxy',
  enableDebug,
  enableHA,
  vaultInfo,
  ...others
}: Props) => {
  const proxyConfig = reverseProxy
    ? await createReverseProxyConfig(reverseProxy, vaultInfo)
    : { configMap: {}, secrets: {} };
  const forwarderConfig = forwardedProxy
    ? await createForwardedProxyConfig(forwardedProxy, vaultInfo)
    : { configMap: {}, secrets: {} };

  const proxy = Deployment({
    ...others,
    name,
    namespace,
    configMap: {
      ...defaultDotNetConfig,
      Logging__LogLevel__Yarp: enableDebug ? 'Debug' : 'Warning',
      FeatureManagement__EnableForwarder: reverseProxy ? 'true' : 'false',
      FeatureManagement__EnableReverseProxy: forwarderConfig ? 'true' : 'false',
      FeatureManagement__EnableHttpLog: enableDebug ? 'true' : 'false',

      ...proxyConfig.configMap,
      ...forwarderConfig.configMap,
    },
    secrets: { ...proxyConfig.secrets, ...forwarderConfig.secrets },

    ingressConfig: ingress,

    podConfig: {
      ports: { http: 8080 },
      image: 'baoduy2412/hbd.yarp-proxy:latest',
    },
    deploymentConfig: { replicas: 1 },
    enableHA: enableHA ? { name, maxReplicas: 3, minReplicas: 1 } : undefined,
  });

  return proxy;
};
