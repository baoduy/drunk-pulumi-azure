import { DefaultK8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';
import Namespace from '../../Core/Namespace';
import { Input, interpolate } from '@pulumi/pulumi';
import KsSecret from '../../Core/KsSecret';

type BackupType = {
  azureStorage?: {
    accountName: Input<string>;
    accountKey: Input<string>;
    containerName: Input<string>;
  };
};

export interface LonghornProps
  extends Omit<DefaultK8sArgs, 'name' | 'namespace'> {
  backup?: BackupType;
}

const configBackup = ({
  name,
  config,
  ...others
}: DefaultK8sArgs & { config: BackupType }) => {
  let backupTarget: Input<string> = '';
  let backupTargetCredentialSecret: Input<string> = '';

  if (config.azureStorage) {
    const { accountName, accountKey, containerName } = config.azureStorage;

    const secret = KsSecret({
      ...others,
      name: `${name}-azure-blob-backup`,
      stringData: {
        AZBLOB_ACCOUNT_NAME: accountName,
        AZBLOB_ACCOUNT_KEY: accountKey,
      },
    });

    backupTargetCredentialSecret = secret.metadata.name;
    backupTarget = interpolate`azblob://${containerName}@core.windows.net/`;
  }

  return { backupTarget, backupTargetCredentialSecret };
};

//https://github.com/longhorn/longhorn/blob/master/chart/values.yaml
export default ({ resources, backup, ...others }: LonghornProps) => {
  const name = 'longhorn';
  const namespace = 'longhorn-system';

  const ns = Namespace({ name: namespace, ...others });
  const backupInfo = backup
    ? configBackup({ name, namespace, config: backup, ...others })
    : {};

  return new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'longhorn',
      fetchOpts: { repo: 'https://charts.longhorn.io' },
      skipAwait: true,

      values: {
        csi: { kubeletRootDir: '/var/lib/kubelet' },
        defaultSettings: {
          ...backupInfo,
          //replicaSoftAntiAffinity: true,
          //replicaZoneSoftAntiAffinity: true,
          //createDefaultDiskLabeledNodes: true,
          //defaultReplicaCount: 2,
          //defaultLonghornStaticStorageClass: 'longhorn-static-storageclass',
          //defaultDataPath:
          guaranteedEngineCPU: 0.1,
          diskType: 'flesystem',
        },
      },
    },
    { ...others, dependsOn: ns }
  );
};
