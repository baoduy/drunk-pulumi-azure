import { DefaultK8sArgs } from '../types';
import Deployment from '../Deployment';
import { Input } from '@pulumi/pulumi';
import { TunnelHelmParameters } from './Tunnel-Helm';

export type TunnelParameters = {
  token: Input<string>;
  enableLiveness?: boolean;
  enableMetrics?: boolean;
  tcp?: Array<{ host: string; service: string; port: number }>;
};

export interface TunnelProps extends Omit<DefaultK8sArgs, 'name'> {
  name?: string;
  replicas?: number;
  parameters: TunnelParameters;
}

export default ({
  name = 'tunnel',
  namespace,
  parameters,
  replicas = 2,

  ...others
}: TunnelProps) => {
  const tcpArgs = parameters.tcp
    ? parameters.tcp.flatMap((t) => [
        '--hostname',
        t.host,
        '--url',
        `tcp://${t.service}:${t.port}`,
      ])
    : [];

  const args = [
    'tunnel',
    ...tcpArgs,
    '--no-autoupdate',
    'run',
    '--token',
    '$(token)',
    // '--config',
    // '/etc/cloudflared/config/config.yaml',
  ];

  if (parameters.enableMetrics) {
    args.push('--metrics', '0.0.0.0:8081');
  }

  const tunnel = Deployment({
    name,
    namespace,

    secrets: { token: parameters.token },

    podConfig: {
      ports: { http: 3000 },
      image: 'cloudflare/cloudflared:latest',
      podSecurityContext: { readOnlyRootFilesystem: true },
      probes: {
        liveness: parameters.enableLiveness
          ? {
              httpGet: '/ready',
              port: 8081,
              initialDelaySeconds: 10,
              periodSeconds: 10,
              failureThreshold: 3,
            }
          : undefined,
      },
    },

    deploymentConfig: {
      replicas,
      args,
    },

    ...others,
  });

  return tunnel;
};
