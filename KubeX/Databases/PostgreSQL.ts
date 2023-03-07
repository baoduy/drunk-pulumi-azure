import { DefaultK8sArgs } from '../types';
import { KeyVaultInfo } from '../../types';
import { randomPassword } from '../../Core/Random';
import { StorageClassNameTypes } from '../Storage';
import * as k8s from '@pulumi/kubernetes';
import { addCustomSecret } from '../../KeyVault/CustomHelper';
import { getPasswordName } from '../../Common/Naming';
import { interpolate, Input } from '@pulumi/pulumi';

interface Props extends DefaultK8sArgs {
  vaultInfo?: KeyVaultInfo;
  auth?: { rootPass?: Input<string> };
  storageClassName: StorageClassNameTypes;
}

export default async ({
  name = 'postgre-sql',
  namespace,
  vaultInfo,
  auth,
  storageClassName,
  provider,
}: Props) => {
  const password = auth?.rootPass
    ? auth.rootPass
    : randomPassword({
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
  }

  const postgre = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'postgresql-ha',
      fetchOpts: { repo: 'https://charts.bitnami.com/bitnami' },
      skipAwait: true,
      values: {
        global: {
          storageClass: storageClassName,
          pgpool: {
            //adminUsername: login.userName,
            adminPassword: password,
          },
          postgresql: {
            //username: login.userName,
            password: password,
            //postgresPassword: login.password,
            //repmgrUsername: 'repmgr',
            repmgrPassword: password,
          },
        },
      },
    },
    { provider }
  );

  return {
    postgre,
    host: interpolate`${name}.${namespace}.svc.cluster.local`,
    username: 'postgres',
    password,
  };
};
