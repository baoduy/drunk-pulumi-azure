import { MySqlProps } from '../types';
import { randomPassword } from '../../Core/Random';
import * as k8s from '@pulumi/kubernetes';
import { interpolate } from '@pulumi/pulumi';

interface MariaDbProps extends MySqlProps {}

export default ({
  name = 'mariadb',
  namespace,
  version,
  vaultInfo,
  auth,
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

  const mariadb = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'mariadb',
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
    mariadb,
    host: interpolate`${name}.${namespace}.svc.cluster.local`,
    username: name,
    password,
  };
};
