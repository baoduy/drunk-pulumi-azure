import { randomPassword } from '../../../Core/Random';
import { interpolate } from '@pulumi/pulumi';
import Deployment from '../../Deployment';
import { createPVCForStorageClass } from '../../Storage';
import { PostgreSqlProps } from '../../types';

export default ({
  name = 'postgree',
  namespace,
  vaultInfo,
  storageClassName,
  auth,
  ...others
}: PostgreSqlProps) => {
  const password =
    auth?.rootPass ||
    randomPassword({
      name,
      length: 25,
      policy: false,
      options: { special: false },
      vaultInfo,
    }).result;

  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    accessMode: 'ReadWriteMany',
    ...others,
    storageClassName,
  });

  const port = 5432;
  const postgrSsql = Deployment({
    name,
    namespace,
    ...others,
    secrets: { POSTGRES_PASSWORD: password },
    podConfig: {
      port,
      image: `postgres:latest`,
      volumes: [
        {
          name: 'data',
          persistentVolumeClaim: persisVolume.metadata.name,
          mountPath: '/var/lib/postgresql',
          readOnly: false,
        },
      ],
      podSecurityContext: { runAsGroup: 1001, runAsUser: 1001 },
    },
    deploymentConfig: {
      //args: ['--default-authentication-plugin=mysql_native_password'],
    },
    serviceConfig: { port: port },
  });

  return {
    postgrSsql,
    host: interpolate`${name}.${namespace}.svc.cluster.local`,
    port,
    username: 'root',
    password,
  };
};
