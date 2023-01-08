import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { DefaultK8sArgs } from "../../types";
import { applyDeploymentRules } from "../SecurityRules";

const defaultConfigs = {
  useForwardedHeaders: "true",
  computeFullForwardedFor: "true",
  useProxyProtocol: "true",
  "use-forwarded-headers": "true",
  "disable-access-log": "true",
  "proxy-buffer-size": "800k",
  "client-header-buffer-size": "800k",
  client_max_body_size: "10m",
  "enable-modsecurity": "true",
  //'modsecurity-snippet': ``,
  "enable-owasp-modsecurity-crs": "true",
  "worker-shutdown-timeout": "100s",
  "worker-connections": "1024",
  "worker-processes": "4", //or auto
  "annotation-value-word-blocklist":
    "load_module,lua_package,_by_lua,location,root,proxy_pass,serviceaccount,{,},\\", //Remove single quote from annotation-value-word-blocklist to allows security content.
};

interface Props extends DefaultK8sArgs {
  version?: string;

  replicaCount?: number;
  useIngressClassOnly?: boolean;
  defaultIngressClass?: boolean;

  network: {
    /** The resource group of virtual network and public IpAddress. */
    vnetResourceGroup?: string;
    internalSubnetName?: pulumi.Output<string>;
    internalIngress?: boolean;
    loadBalancerIP?: pulumi.Input<string>;
    clusterIP?: pulumi.Input<string>;
  };

  /**The nginx config map */
  config?: { [key: string]: string } | typeof defaultConfigs;
  /**Expose TCP Ports {port: dnsName} */
  tcp?: { [key: string]: string };
  /**Expose UDP ports  {port: dnsName} */
  udp?: { [key: string]: string };

  /** Set Proxy Headers. It will be applied to all requests*/
  addHeaders?: { [key: string]: string };
  proxySetHeaders?: { [key: string]: string };

  enableDebug?: boolean;
  dependsOn?:
    | pulumi.Input<pulumi.Input<pulumi.Resource>[]>
    | pulumi.Input<pulumi.Resource>;
}

/**
 * kubectl exec ingress-nginx-controller-873061567-4n3k2 -n ingress-nginx -- cat /etc/nginx/nginx.conf >> nginx.conf
 * https://github.com/kubernetes/ingress-nginx
 */

export default ({
  name,
  namespace = "nginx",
  version,

  useIngressClassOnly = true,
  defaultIngressClass,
  replicaCount = 1,
  network,
  config,
  tcp,
  udp,
  addHeaders,
  proxySetHeaders,

  enableDebug = false,
  provider,
  dependsOn,
}: Props) => {
  //Annotations
  const annotations: any = {};

  if (network.internalIngress) {
    annotations["service.beta.kubernetes.io/azure-load-balancer-internal"] =
      "true";
  }
  if (network.vnetResourceGroup) {
    annotations[
      "service.beta.kubernetes.io/azure-load-balancer-resource-group"
    ] = network.vnetResourceGroup;
  }
  if (network.internalSubnetName) {
    annotations[
      "service.beta.kubernetes.io/azure-load-balancer-internal-subnet"
    ] = network.internalSubnetName;
  }

  // Create a NGINX Deployment
  const nginx = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: "ingress-nginx",
      version,
      fetchOpts: {
        repo: "https://kubernetes.github.io/ingress-nginx",
      },
      skipAwait: true,
      values: {
        tcp,
        udp,
        proxySetHeaders,
        addHeaders,

        controller: {
          replicaCount,

          proxySetHeaders,
          addHeaders,
          config: {
            ...defaultConfigs,
            ...config,
            "error-log-level": enableDebug ? "debug" : "notice", // notice or error
          },

          useIngressClassOnly,
          watchIngressWithoutClass: defaultIngressClass,

          ingressClass: useIngressClassOnly ? name : "nginx",
          ingressClassResource: useIngressClassOnly
            ? {
                name,
                controllerValue: `k8s.io/nginx-${name}`,
                enabled: true,
                default: defaultIngressClass,
              }
            : undefined,

          nodeSelector: {
            "kubernetes.io/os": "linux",
          },

          service: {
            externalTrafficPolicy: "Local",
            annotations,
            clusterIP: network.clusterIP,
            loadBalancerIP: network.loadBalancerIP,
          },
          resources: {
            limits: {
              cpu: "1000m",
              memory: "1Gi",
            },
            requests: {
              cpu: "10m",
              memory: "10Mi",
            },
          },
          // metrics: {
          //   enabled: true,
          // },
        },
      },

      transformations: [
        (obj: any) => {
          applyDeploymentRules(obj, {
            //ignoredKinds: isPrd ? ['Job'] : undefined,
            ignoreSecurityContext: true,
          });
        },
      ],
    },
    { provider, dependsOn }
  );

  return nginx;
};
