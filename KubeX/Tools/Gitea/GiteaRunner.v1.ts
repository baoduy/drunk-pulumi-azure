import { DefaultK8sArgs } from '../../types';
import { apps } from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import { createPVCForStorageClass } from '../../Storage';
import * as k8s from '@pulumi/kubernetes';

interface GiteaRunnerProps extends DefaultK8sArgs {
  storageClassName: Input<string>;
  giteaUrl?: Input<string>;
  giteaToken: Input<string>;
  /* the value separate by comma*/
  labels?: Input<string>;
  storageGb?: number;
}

export default ({
  name = 'gitea-runner',
  namespace,
  storageClassName,
  labels,
  storageGb = 10,
  giteaUrl,
  giteaToken,
  resources,
  ...others
}: GiteaRunnerProps) => {
  const userId = 1000;
  const dockerSock = `/run/user/${userId}/docker.sock`;

  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    accessMode: 'ReadWriteOnce',
    storageGb: `${storageGb}Gi`,
    storageClassName,
    ...others,
  });

  const env = [
    {
      name: 'DOCKER_HOST',
      value: `unix://${dockerSock}`,
    },
    // {
    //   name: 'DOCKER_CERT_PATH',
    //   value: '/certs/client',
    // },
    // {
    //   name: 'DOCKER_TLS_VERIFY',
    //   value: '0',
    // },
    {
      name: 'GITEA_RUNNER_NAME',
      value: name,
    },
    {
      name: 'GITEA_INSTANCE_URL',
      value: giteaUrl,
    },
  ];

  if (labels) {
    env.push({
      name: 'GITEA_RUNNER_LABELS',
      value: `${labels},ubuntu-latest:docker://catthehacker/ubuntu:runner-22.04,ubuntu-22.04:docker://catthehacker/ubuntu:runner-22.04,ubuntu-20.04:docker://catthehacker/ubuntu:runner-20.04`,
    });
  } else
    env.push({
      name: 'GITEA_RUNNER_LABELS',
      value:
        'ubuntu-latest:docker://catthehacker/ubuntu:runner-22.04,ubuntu-22.04:docker://catthehacker/ubuntu:runner-22.04,ubuntu-20.04:docker://catthehacker/ubuntu:runner-20.04',
    });

  const secret = new k8s.core.v1.Secret(
    name,
    {
      metadata: {
        name,
        namespace,
      },
      stringData: {
        GITEA_RUNNER_REGISTRATION_TOKEN: giteaToken,
      },
    },
    others
  );
  return new apps.v1.Deployment(
    name,
    {
      metadata: {
        name,
        namespace,
        labels: { app: name },
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: name } },
        strategy: {},
        template: {
          metadata: { labels: { app: name } },
          spec: {
            securityContext: {
              runAsUser: userId,
              runAsGroup: userId,
              fsGroup: userId,
            },
            containers: [
              {
                command: [
                  'sh',
                  '-c',
                  `(sleep 10 && chmod a+rwx ${dockerSock}) & /usr/bin/supervisord -c /etc/supervisord.conf`,
                ],
                image: 'gitea/act_runner:nightly-dind-rootless',
                name: 'runner',

                env,
                envFrom: [
                  {
                    secretRef: {
                      name: secret.metadata.name,
                    },
                  },
                ],
                securityContext: {
                  privileged: true,
                },
                volumeMounts: [
                  {
                    mountPath: '/data',
                    name: 'runner-data',
                  },
                ],

                resources: {
                  requests: {
                    'ephemeral-storage': '10Gi',
                  },
                },
              },
            ],
            restartPolicy: 'Always',
            volumes: [
              {
                name: 'runner-data',
                persistentVolumeClaim: {
                  claimName: persisVolume.metadata.name,
                },
              },
            ],
          },
        },
      },
    },
    others
  );
};
