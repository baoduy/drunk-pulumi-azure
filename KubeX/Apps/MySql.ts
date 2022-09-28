import { DefaultK8sArgs } from '../types';
import { KeyVaultInfo } from '../../types';
import { randomPassword } from '../../Core/Random';
import { StorageClassNameTypes } from '../Storage';
import { addCustomSecret } from '../../KeyVault/CustomHelper';
import { getPasswordName } from '../../Common/Naming';
import { interpolate } from '@pulumi/pulumi';
import Deployment from '../Deployment';
import { createPVCForStorageClass } from '../Storage';

interface Props extends DefaultK8sArgs {
  host: string;
  version?: string;
  customPort?: number;
  useClusterIP?: boolean;
  vaultInfo?: KeyVaultInfo;
  storageClassName: StorageClassNameTypes;
}

export default async ({
  name,
  host,
  namespace,
  version = 'latest',
  customPort,
  useClusterIP,
  vaultInfo,
  storageClassName,
  ...others
}: Props) => {
  const password = randomPassword({
    name,
    length: 25,
    options: { special: false },
  }).result;

  if (vaultInfo) {
    await addCustomSecret({
      name: getPasswordName(name, null),
      vaultInfo,
      value: password,
      contentType: name,
    });
  }

  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    ...others,
    storageClassName,
  });

  const port = 3306;
  const mysql = Deployment({
    name,
    namespace,
    ...others,
    secrets: { MYSQL_ROOT_PASSWORD: password },
    podConfig: {
      port,
      image: `mysql:${version}`,
      volumes: [
        {
          name: 'mysql-data',
          persistentVolumeClaim: persisVolume.metadata.name,
          mountPath: '/var/lib/mysql',
        },
      ],
    },
    deploymentConfig: {
      args: ['--default-authentication-plugin=mysql_native_password'],
    },
    serviceConfig: { port: customPort || port, useClusterIP },
  });

  return {
    mysql,
    host,
    internalHost: interpolate`${name}.${namespace}.svc.cluster.local`,
    username: name,
    password,
  };
};
