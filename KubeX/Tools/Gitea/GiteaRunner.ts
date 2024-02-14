import { DefaultK8sArgs } from '../../types';
import Deployment from '../../Deployment';
import { Input, interpolate } from '@pulumi/pulumi';
import { createPVCForStorageClass } from '../../Storage';

interface GiteaRunnerProps extends DefaultK8sArgs {
  storageClassName: Input<string>;
  giteaUrl?: Input<string>;
  giteaToken: Input<string>;
  storageGb?: number;
}

export default ({
  name = 'gitea-runner',
  namespace,
  storageClassName,
  storageGb = 10,
  giteaUrl,
  giteaToken,
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

  return Deployment({
    name,
    namespace,

    configMap: {
      DOCKER_HOST: 'tcp://localhost:2376',
      DOCKER_CERT_PATH: '/certs/client',
      DOCKER_TLS_VERIFY: '1',
      GITEA_RUNNER_NAME: name,
      //GITEA_RUNNER_LABELS: '',
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
      resources,
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
    dependsOn: persisVolume,
  });
};
