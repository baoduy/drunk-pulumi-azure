import { DefaultK8sArgs } from '../../types';
import { Input } from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

interface GiteaRunnerProps extends DefaultK8sArgs {
  storageClassName: Input<string>;
  giteaUrl?: Input<string>;
  giteaToken: Input<string>;
  labels?: string[];
}

//https://github.com/kha7iq/charts/tree/main/charts/act-runner
export default ({
  name = 'gitea-runner',
  namespace,
  storageClassName,
  labels,
  giteaUrl,
  giteaToken,

  resources,
  ...others
}: GiteaRunnerProps) => {
  const env = [
    { name: 'DOCKER_HOST', value: 'tcp://localhost:2376' },
    { name: 'DOCKER_CERT_PATH', value: '/certs/client' },
    { name: 'DOCKER_TLS_VERIFY', value: '1' },
    { name: 'GITEA_RUNNER_NAME', value: name },
  ];

  if (labels) {
    env.push({ name: 'GITEA_RUNNER_LABELS', value: labels.join(',') });
  }
  const runner = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'act-runner',
      fetchOpts: { repo: 'https://charts.lmno.pk' },

      values: {
        env,
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
