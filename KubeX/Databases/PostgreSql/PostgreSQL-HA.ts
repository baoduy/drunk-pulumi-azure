import { randomPassword } from '../../../Core/Random';
import * as k8s from '@pulumi/kubernetes';
import { interpolate } from '@pulumi/pulumi';
import { PostgreSqlProps } from '../../types';

export default async ({
  name = 'postgre-sql',
  namespace,
  vaultInfo,
  auth,
  storageClassName,
  provider,
}: PostgreSqlProps) => {
  const password = auth?.rootPass
    ? auth.rootPass
    : randomPassword({
        name,
        length: 25,
        options: { special: false },
        vaultInfo,
      }).result;

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
          //architecture: 'standalone'
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
