import { DefaultK8sArgs } from '../types';
import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import { randomPassword } from '../../Core/Random';
import { KeyVaultInfo } from '../../types';

interface HarborRepoProps extends DefaultK8sArgs {
  vaultInfo?: KeyVaultInfo;

  externalURL: string;
  coreURL: string;
  notaryURL: string;
  tlsSecretName: string;

  storageClass: Input<string>;
  accessMode?: 'ReadWriteMany' | 'ReadWriteOnce';
  postgres: {
    host: Input<string>;
    port: Input<number>;
    coreDatabase: Input<string>;
    username: Input<string>;
    password: Input<string>;
    sslmode?: boolean;
  };
  redis?: {
    addr: Input<string>;
    port: Input<number>;
    username: Input<string>;
    password: Input<string>;
  };
}

//https://github.com/goharbor/harbor-helm
export default ({
  name = 'harbor',
  namespace,

  externalURL,
  coreURL,
  notaryURL,
  tlsSecretName,

  storageClass,
  accessMode = 'ReadWriteOnce',
  postgres,
  redis,
  vaultInfo,
  provider,
  dependsOn,
}: HarborRepoProps) => {
  const redisType = redis ? 'external' : 'internal';
  const randomPassOptions = {
    length: 16,
    options: { special: false },
    policy: false,
    vaultInfo,
  };

  const harbor = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'harbor',
      fetchOpts: { repo: 'https://helm.goharbor.io' },

      values: {
        expose: {
          type: 'clusterIP', // ingress, clusterIP, nodePort, loadBalancer
          tls: { auto: { commonName: externalURL.replace('https://', '') } },
          ingress: {
            hosts: {
              core: coreURL,
              notary: notaryURL,
              secretName: tlsSecretName,
            },
          },
        },
        externalURL,

        //Admin Password
        harborAdminPassword: randomPassword({
          name: `${name}-admin`,
          ...randomPassOptions,
        }).result,

        // secret: randomPassword({
        //   name: `${name}-secret`,
        //   ...randomPassOptions,
        // }).result,

        //Secret key for encryption mus be 16 characters
        secretKey: randomPassword({
          name: `${name}-secretKey`,
          ...randomPassOptions,
        }).result,

        trivy: { enabled: true },
        database: { type: 'external', external: postgres },
        redis: {
          type: redisType,
          external: redis,
          internal: redisType === 'internal' ? {} : undefined,
        },
        persistence: {
          persistentVolumeClaim: {
            registry: {
              storageClass,
              accessMode,
            },
            chartmuseum: {
              storageClass,
              accessMode,
            },
            jobservice: {
              storageClass,
              accessMode,
            },
            redis:
              redisType === 'internal'
                ? {
                    storageClass,
                    accessMode,
                  }
                : undefined,
          },
        },
      },
    },
    { provider, dependsOn }
  );

  return harbor;
};
