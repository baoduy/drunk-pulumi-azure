import { DefaultK8sArgs } from '../../types';
import { Input, interpolate } from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

interface GiteaRunnerProps extends DefaultK8sArgs {
  storageClassName: Input<string>;
  giteaUrl?: Input<string>;
  giteaToken: Input<string>;
}

//https://github.com/kha7iq/charts/tree/main/charts/act-runner
export default ({
  name = 'gitea-runner',
  namespace,
  storageClassName,

  giteaUrl,
  giteaToken,

  resources,
  ...others
}: GiteaRunnerProps) => {
  const runner = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'act-runner',
      fetchOpts: { repo: 'https://charts.lmno.pk' },

      values: {
        runner: {
          instanceURL: giteaUrl,
          runnerToken: { value: giteaToken },
          dockerDind: { enabled: true },
        },
        persistence: { storageClassName },
      },
    },
    others
  );
};
