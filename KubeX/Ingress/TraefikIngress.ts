import * as k8s from '@pulumi/kubernetes';
import * as kx from '../KubX';
import { Input, Resource } from '@pulumi/pulumi';
import { DefaultK8sArgs } from '../types';
import { ServicePort } from './type';

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
      apiVersion: 'traefik.containo.us/v1alpha1',
      kind: 'IngressRouteTCP',
      metadata: {
        name,
        namespace,
        annotations: { 'pulumi.com/skipAwait': 'true' },
      },
      spec: {
        entryPoints: [name],
        routes: [
          { match: 'HostSNI(`*`)', kind: 'Rule', services: [{ name, port }] },
        ],
      },
    },
    { ...others }
  );
};

export interface TraefikIngressProps extends Omit<DefaultK8sArgs, 'namespace'> {
  hostNames: Input<string>[];
  allowHttp?: boolean;
  tlsSecretName?: Input<string>;
  service:
    | kx.Service
    | k8s.core.v1.Service
    | {
        metadata: {
          name: Input<string>;
          namespace: Input<string>;
          labels?: Input<{ [key: string]: Input<string> }>;
        };
        spec: { ports: Array<ServicePort> };
      };
}

export default ({
  name,
  hostNames,
  allowHttp,
  tlsSecretName,
  service,
  ...others
}: TraefikIngressProps) => {
  const annotations = {} as any;

  if (!allowHttp) {
    annotations['traefik.ingress.kubernetes.io/router.entrypoints'] =
      'websecure';
    annotations['ttraefik.ingress.kubernetes.io/router.tls'] = 'true';
  }

  return new k8s.networking.v1.Ingress(
    name,
    {
      metadata: {
        name,
        namespace: service.metadata.namespace,
        labels: service.metadata.labels,
        annotations,
      },
      spec: {
        rules: hostNames.map((hostName) => ({
          host: hostName,
          http: {
            paths: [
              {
                backend: {
                  service: {
                    name: service.metadata.name,
                    port: {
                      number: service.spec.ports[0].port,
                    },
                  },
                },
                path: '/',
                pathType: 'ImplementationSpecific',
              },
            ],
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
