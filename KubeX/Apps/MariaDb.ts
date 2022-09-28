import { DefaultK8sArgs } from '../types';
import { KeyVaultInfo } from '../../types';
import { randomLogin, randomPassword } from '../../Core/Random';
import { StorageClassNameTypes } from '../Storage';
import * as k8s from '@pulumi/kubernetes';
import { addCustomSecret } from '../../KeyVault/CustomHelper';
import { getPasswordName } from '../../Common/Naming';
import { interpolate } from '@pulumi/pulumi';

interface Props extends DefaultK8sArgs {
  host: string;
  version?: string;
  type?: 'mysql' | 'mariadb';
  debug?: boolean;
  vaultInfo?: KeyVaultInfo;
  storageClassName: StorageClassNameTypes;
}

export default async ({
  name = 'my-sql',
  host,
  namespace,
  version,
  type = 'mariadb',
  debug = false,
  vaultInfo,
  storageClassName,
  provider,
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

  const mysql = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: type,
      fetchOpts: { repo: 'https://charts.bitnami.com/bitnami' },

      values: {
        global: {
          storageClass: storageClassName,
        },
        image: { tag: version },
        auth: {
          rootPassword: password,
          password,
          username: name,
          database: name,
        },
      },
    },
    { provider }
  );

  return {
    mysql,
    host,
    internalHost: interpolate`${name}.${namespace}.svc.cluster.local`,
    username: name,
    password,
  };
};
