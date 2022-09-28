import * as k8s from '@pulumi/kubernetes';
import * as kx from '../KubX';
import { Input, Resource } from '@pulumi/pulumi';
import { DefaultK8sArgs } from '../types';

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
