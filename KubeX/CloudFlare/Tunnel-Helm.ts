import { DefaultK8sArgs } from '../types';
import Deployment from '../Deployment';
import { Input } from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

export type TunnelHelmParameters = {
  account: Input<string>;
  tunnelName: Input<string>;
  tunnelId: Input<string>;
  secret: Input<string>;
  enableWarp?: Input<boolean>;
};

export interface TunnelHelmProps extends Omit<DefaultK8sArgs, 'name'> {
  name?: string;
  replicas?: number;
  parameters: TunnelHelmParameters;
}

export default ({
  name = 'tunnel',
  namespace,

  parameters,
  replicas = 2,
  ...others
}: TunnelHelmProps) =>
  new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'cloudflare-tunnel',
      fetchOpts: { repo: 'https://cloudflare.github.io/helm-charts' },

      values: {
        cloudflare: parameters,
      },
    },
    others
  );
