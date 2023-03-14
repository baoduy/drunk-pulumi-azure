import { DefaultK8sArgs } from '../types';
import { KeyVaultInfo } from '../../types';
import { randomPassword } from '../../Core/Random';
import { StorageClassNameTypes } from '../Storage';
import { addCustomSecret } from '../../KeyVault/CustomHelper';
import { getPasswordName } from '../../Common/Naming';
import { Input, interpolate } from '@pulumi/pulumi';
import Deployment from '../Deployment';
import { createPVCForStorageClass } from '../Storage';

interface Props extends DefaultK8sArgs {
  version?: string;
  vaultInfo?: KeyVaultInfo;
  auth?: { password?: Input<string> };
  storageClassName?: StorageClassNameTypes;
}

export default ({
  name,
  namespace,
  version = 'latest',
  vaultInfo,
  auth,
  storageClassName,
  ...others
}: Props) => {
  const port = 6379;

  const password =
    auth?.password ||
    randomPassword({
      name,
      length: 25,
      options: { special: false },
    }).result;

  if (vaultInfo) {
    addCustomSecret({
      name: getPasswordName(name, null),
      vaultInfo,
      value: password,
      contentType: name,
    });

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
      port,
      image: `redis:${version}`,
      volumes: persisVolume
        ? [
            {
              name: 'redis-data',
              persistentVolumeClaim: persisVolume.metadata.name,
              mountPath: '/data',
            },
          ]
        : undefined,
    },
    deploymentConfig: {
      args: [interpolate`--requirepass ${password}`],
    },
    serviceConfig: { port },
  });

  return {
    redis,
    host: interpolate`${name}.${namespace}.svc.cluster.local`,
    password,
  };
};
