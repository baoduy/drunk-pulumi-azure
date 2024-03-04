import * as k8s from '@pulumi/kubernetes';
import { DefaultK8sArgs } from '../../types';

interface CustomHeaderProps extends Omit<DefaultK8sArgs, 'namespace'> {
  headers?: { [key: string]: any };
  customRequestHeaders?: { [key: string]: any };
  customResponseHeaders?: { [key: string]: any };
}

export default ({
  name = 'traefik',
  headers,
  customRequestHeaders,
  customResponseHeaders,
  ...others
}: CustomHeaderProps) =>
  new k8s.apiextensions.CustomResource(
    name,
    {
      apiVersion: 'traefik.containo.us/v1alpha1',
      kind: 'Middleware',
      metadata: {
        name,
        annotations: { 'pulumi.com/skipAwait': 'true' },
      },
      spec: {
        headers: { ...headers, customRequestHeaders, customResponseHeaders },
      },
    },
    { ...others }
  );
