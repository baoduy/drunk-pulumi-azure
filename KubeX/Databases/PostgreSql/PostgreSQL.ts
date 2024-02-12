import { randomPassword } from '../../../Core/Random';
import * as k8s from '@pulumi/kubernetes';
import { interpolate } from '@pulumi/pulumi';
import { PostgreSqlProps } from '../../types';

export default ({
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
        policy: false,
        vaultInfo,
      }).result;

  const postgre = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'postgresql',
      fetchOpts: { repo: 'https://charts.bitnami.com/bitnami' },
      skipAwait: true,
      values: {
        global: {
          storageClass: storageClassName,
          //architecture: 'standalone'
          // postgresql: {
          //   auth: {
          //     username: 'postgres',
          //     database: 'postgres',
          //     password: password,
          //     postgresPassword: password,
          //   },
          // },
        },
        auth: {
          enablePostgresUser: true,
          postgresPassword: password,
          username: 'postgres',
          password: password,
          database: 'postgres',
        },
      },
    },
    { provider }
  );

  return {
    postgre,
    host: interpolate`${name}.${namespace}.svc.cluster.local`,
    port: 5432,
    username: 'postgres',
    password,
  };
};
