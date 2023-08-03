import { MySqlProps } from '../types';
import { randomPassword } from '../../Core/Random';
import * as k8s from '@pulumi/kubernetes';
import { interpolate } from '@pulumi/pulumi';

interface MariaDbProps extends MySqlProps {}

export default ({
  name = 'mysql',
  namespace,
  version,
  auth,
  vaultInfo,
  storageClassName,
  provider,
}: MariaDbProps) => {
  const password = auth?.rootPass
    ? auth.rootPass
    : randomPassword({
        name,
        length: 25,
        options: { special: false },
        vaultInfo,
      }).result;

  const mysql = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'mysql',
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
    host: interpolate`${name}.${namespace}.svc.cluster.local`,
    username: name,
    password,
  };
};
