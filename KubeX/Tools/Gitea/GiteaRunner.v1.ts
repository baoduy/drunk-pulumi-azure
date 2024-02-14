import { DefaultK8sArgs } from '../../types';
import { apps } from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import { createPVCForStorageClass } from '../../Storage';

interface GiteaRunnerProps extends DefaultK8sArgs {
  storageClassName: Input<string>;
  giteaUrl?: Input<string>;
  giteaToken: Input<string>;
  dockerHost?: Input<string>;
  image?: string;
  storageGb?: number;
}

export default ({
  name = 'gitea-runner',
  namespace,
  storageClassName,
  storageGb = 10,
  giteaUrl,
  giteaToken,
  dockerHost = 'tcp://localhost:2376',
  image = 'gitea/act_runner:nightly', // 'gitea/act_runner:latest', // 'gitea/act_runner:nightly-dind-rootless',
  resources,
  ...others
}: GiteaRunnerProps) => {
  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    accessMode: 'ReadWriteOnce',
    storageGb: `${storageGb}Gi`,
    storageClassName,
    ...others,
  });

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
            containers: [
              {
                // command: [
                //   'sh',
                //   '-c',
                //   "while ! nc -z localhost 2376 </dev/null; do echo 'waiting for docker daemon...'; sleep 5; done; /sbin/tini -- /opt/act/run.sh",
                // ],
                env: [
                  {
                    name: 'DOCKER_HOST',
                    value: dockerHost,
                  },
                  {
                    name: 'DOCKER_CERT_PATH',
                    value: '/certs/client',
                  },
                  {
                    name: 'DOCKER_TLS_VERIFY',
                    value: '0',
                  },
                  {
                    name: 'GITEA_RUNNER_NAME',
                    value: name,
                  },
                  {
                    name: 'GITEA_INSTANCE_URL',
                    value: giteaUrl,
                  },
                  {
                    name: 'GITEA_RUNNER_REGISTRATION_TOKEN',
                    value: giteaToken,
                  },
                ],
                image,
                name: 'runner',
                securityContext: {
                  privileged: true,
                },
                volumeMounts: [
                  {
                    mountPath: '/certs',
                    name: 'docker-certs',
                  },
                  {
                    mountPath: '/data',
                    name: 'runner-data',
                  },
                  { name: 'docker-host', mountPath: '/var/run/docker.sock' },
                ],
              },
              // {
              //   env: [
              //     {
              //       name: 'DOCKER_TLS_CERTDIR',
              //       value: '/certs',
              //     },
              //   ],
              //   image: 'docker:23.0.6-dind',
              //   name: 'daemon',
              //   securityContext: {
              //     privileged: true,
              //   },
              //   volumeMounts: [
              //     {
              //       mountPath: '/certs',
              //       name: 'docker-certs',
              //     },
              //   ],
              // },
            ],
            restartPolicy: 'Always',
            volumes: [
              {
                emptyDir: {},
                name: 'docker-certs',
              },
              {
                name: 'docker-host',
                hostPath: { path: '/var/run/docker.sock' },
              },
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
