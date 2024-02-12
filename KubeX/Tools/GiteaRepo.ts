import { DefaultK8sArgs } from '../types';
import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import { randomPassword } from '../../Core/Random';
import { KeyVaultInfo } from '../../types';

interface HarborRepoProps extends DefaultK8sArgs {
  vaultInfo?: KeyVaultInfo;
  storageClass: Input<string>;

  postgres: {
    host: Input<string>;
    port: Input<number>;
    database: Input<string>;
    username: Input<string>;
    password: Input<string>;
    sslmode?: boolean;
  };
}

// https://github.com/go-gitea/gitea
// https://gitea.com/gitea/helm-chart
export default ({
  name = 'gitea',
  namespace,

  storageClass,
  postgres,

  vaultInfo,
  provider,
  dependsOn,
}: HarborRepoProps) => {
  const randomPassOptions = {
    length: 16,
    options: { special: false },
    policy: false,
    vaultInfo,
  };

  const gitea = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'gitea',
      fetchOpts: { repo: 'https://dl.gitea.com/charts' },

      values: {
        gitea: {
          admin: {
            username: `${name}Admin`,
            email: `${name}Admin@drunkcoding.net`,
            password: randomPassword({
              name: `${name}-admin`,
              ...randomPassOptions,
            }).result,
          },
          database: {
            DB_TYPE: 'postgres',
            HOST: `${postgres.host}:${postgres.port}`,
            NAME: postgres.database,
            USER: postgres.username,
            PASSWD: postgres.password,
            SCHEMA: 'gitea',
          },
        },

        'redis-cluster': { enabled: false },
        postgresql: { enabled: false },
        'postgresql-ha': { enabled: false },

        persistence: { enabled: true, storageClass },
      },
    },
    { provider, dependsOn }
  );

  return gitea;
};
