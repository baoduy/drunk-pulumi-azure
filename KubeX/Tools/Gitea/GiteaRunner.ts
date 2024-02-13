import { DefaultK8sArgs } from '../../types';
import Deployment from '../../Deployment';
import { Input, interpolate } from '@pulumi/pulumi';
import { createPVCForStorageClass } from '../../Storage';

interface GiteaRunnerProps extends DefaultK8sArgs {
  storageClassName: Input<string>;
  giteaUrl?: Input<string>;
  giteaToken: Input<string>;
}

export default ({
  name = 'gitea-runner',
  namespace,
  storageClassName,
  giteaUrl,
  giteaToken,
  ...others
}: GiteaRunnerProps) => {
  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    accessMode: 'ReadWriteOnce',
    ...others,
    storageClassName,
  });

  return Deployment({
    name,
    namespace,

    configMap: {
      DOCKER_HOST: 'tcp://localhost:2376',
      DOCKER_CERT_PATH: '/certs/client',
      DOCKER_TLS_VERIFY: '0',
      GITEA_INSTANCE_URL:
        giteaUrl ??
        interpolate`http://gitea-http.${namespace}.svc.cluster.local:3000`,
    },
    secrets: { GITEA_RUNNER_REGISTRATION_TOKEN: giteaToken },

    podConfig: {
      image: 'gitea/act_runner:nightly-dind-rootless',
      ports: { http: 3000 },
      securityContext: { fsGroup: 1000 },
      podSecurityContext: { privileged: true },
      volumes: [
        {
          name: 'runner-data',
          mountPath: '/data',
          persistentVolumeClaim: persisVolume.metadata.name,
          readOnly: false,
        },
      ],
    },

    ...others,
  });
};
