import { MySqlProps } from '../types';
import { randomPassword } from '../../Core/Random';
import { addCustomSecret } from '../../KeyVault/CustomHelper';
import { interpolate } from '@pulumi/pulumi';
import Deployment from '../Deployment';
import { createPVCForStorageClass } from '../Storage';

interface Props extends MySqlProps {
  version?: string;
}

export default ({
  name = 'redis',
  namespace,
  version = 'latest',
  vaultInfo,
  auth,
  storageClassName,
  ...others
}: Props) => {
  const port = 6379;

  const password =
    auth?.rootPass ||
    randomPassword({
      name,
      length: 25,
      options: { special: false },
      vaultInfo,
    }).result;

  if (vaultInfo) {
    const conn = interpolate`${name}.${namespace}.svc.cluster.local:${port},password=${password},ssl=False,abortConnect=False`;
    addCustomSecret({
      name: `${name}-conn`,
      vaultInfo,
      value: conn,
      contentType: name,
    });
  }

  const persisVolume = storageClassName
    ? createPVCForStorageClass({
        name,
        namespace,
        ...others,
        storageClassName,
      })
    : undefined;

  const redis = Deployment({
    name,
    namespace,
    ...others,
    secrets: { PASSWORD: password },
    podConfig: {
      ports: { http: port },
      image: `redis:${version}`,
      podSecurityContext: {},
      securityContext: {},
      volumes: persisVolume
        ? [
            {
              name: 'redis-data',
              persistentVolumeClaim: persisVolume.metadata.name,
              mountPath: '/data',
              readOnly: false,
            },
          ]
        : undefined,
    },
    deploymentConfig: {
      args: [interpolate`--requirepass ${password}`],
    },
  });

  return {
    redis,
    host: interpolate`${name}.${namespace}.svc.cluster.local`,
    password,
  };
};
