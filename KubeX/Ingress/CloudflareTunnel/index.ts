import { DefaultK8sArgs } from '../../types';
import Deployment from '../../Deployment';
import { Input } from '@pulumi/pulumi';
import Namespace from '../../Core/Namespace';
export interface Props extends Omit<DefaultK8sArgs, 'name' | 'namespace'> {
  token: Input<string>;
  replicas?: number;
  enableLiveness?: boolean;
  enableMetrics?: boolean;
  tcp?: Array<{ host: string; service: string; port: number }>;
}

export default async ({
  token,
  replicas = 2,
  enableLiveness,
  enableMetrics,
  tcp = [],
  ...others
}: Props) => {
  const name = 'cloudflare-tunnel';
  const ns = Namespace({ name: 'cloudflare', ...others });

  const tcpArgs = tcp.flatMap((t) => [
    '--hostname',
    t.host,
    '--url',
    `tcp://${t.service}:${t.port}`,
  ]);

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

  if (enableMetrics) {
    args.push('--metrics', '0.0.0.0:8081');
  }

  const tunnel = await Deployment({
    name,
    namespace: ns.metadata.name,

    secrets: { token },

    podConfig: {
      port: 3000,
      image: 'cloudflare/cloudflared:latest',
      podSecurityContext: { readOnlyRootFilesystem: false },
      probes: {
        liveness: enableLiveness
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
