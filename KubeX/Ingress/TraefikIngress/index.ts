import * as k8s from "@pulumi/kubernetes";
import { DefaultK8sArgs } from "../../types";
import { IngressProps } from "../type";

export interface TraefikTcpIngressProps extends DefaultK8sArgs {
  port: number;
}

export const TcpIngress = ({
  name,
  namespace,
  port,
  ...others
}: TraefikTcpIngressProps) => {
  return new k8s.apiextensions.CustomResource(
    name,
    {
      apiVersion: "traefik.containo.us/v1alpha1",
      kind: "IngressRouteTCP",
      metadata: {
        name,
        namespace,
        annotations: { "pulumi.com/skipAwait": "true" },
      },
      spec: {
        entryPoints: [name],
        routes: [
          { match: "HostSNI(`*`)", kind: "Rule", services: [{ name, port }] },
        ],
      },
    },
    { ...others }
  );
};

export interface TraefikIngressProps extends IngressProps {}

export default ({
  name,
  hostNames,
  allowHttp,
  tlsSecretName,
  service,
  services,
  certManagerIssuer,
  cors,
  ...others
}: TraefikIngressProps) => {
  const annotations = {
    "traefik.ingress.kubernetes.io/router.entrypoints": "websecure,web",
  } as any;

  if (!allowHttp) {
    annotations["ttraefik.ingress.kubernetes.io/router.tls"] = "true";
  }

  if (certManagerIssuer) {
    if (typeof certManagerIssuer === "string")
      annotations["cert-manager.io/cluster-issuer"] = certManagerIssuer;
    else annotations["kubernetes.io/tls-acme"] = "true";
  }
  if (cors) {
    const origin = cors.origins.join(",");
    const header = cors.headers
      ? cors.headers.join(",")
      : "GET,POST,PUT,OPTIONS,DELETE";

    annotations[
      "traefik.ingress.kubernetes.io/custom-response-headers"
    ] = `Access-Control-Allow-Origin:${origin}||Access-Control-Allow-Methods:${header}||Access-Control-Allow-Headers:DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range||Access-Control-Expose-Headers:Content-Length,Content-Range`;
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
        pathType: "Prefix",
      }))
    : [
        {
          backend: {
            service: {
              name: service!.metadata.name,
              port: {
                number: service!.spec.ports[0].port,
              },
            },
          },
          path: "/",
          pathType: "ImplementationSpecific",
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
        rules: hostNames.map((hostName) => ({
          host: hostName,
          http: {
            paths: servicePaths,
          },
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
    { ...others }
  );
};
