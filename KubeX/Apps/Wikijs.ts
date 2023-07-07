import { DefaultKsAppArgs } from '../types';
import Deployment from '../Deployment';
import { Input } from '@pulumi/pulumi';
import Identity from '../../AzAd/Identity';
import { KeyVaultInfo } from '../../types';
import { getGraphPermissions } from '../../AzAd/GraphDefinition';

export interface WikiJsProps extends DefaultKsAppArgs {
  vaultInfo?: KeyVaultInfo;
  createAzureAdIdentity?: boolean;
  useVirtualHost?: boolean;
  postgresql: {
    host: Input<string>;
    database: Input<string>;
    username: Input<string>;
    password: Input<string>;
  };
}

export default async ({
  name = 'wiki',
  namespace,
  ingress,
  createAzureAdIdentity,
  useVirtualHost,
  vaultInfo,
  postgresql,
  provider,
}: WikiJsProps) => {
  const hostName = `${name}.${ingress?.domain}`;

  const graphAccess = getGraphPermissions(
    { name: 'User.Read.All', type: 'Role' },
    { name: 'User.Read', type: 'Scope' },
    { name: 'email', type: 'Scope' },
    { name: 'openid', type: 'Scope' },
    { name: 'profile', type: 'Scope' }
  );

  const identity = createAzureAdIdentity
    ? await Identity({
        name,
        createClientSecret: true,
        vaultInfo,
        allowMultiOrg: false,
        replyUrls: [`https://${hostName}/login/azure/callback`],
        homepage: `https://${hostName}`,
        //allowImplicit: true,
        appType: 'web',
        requiredResourceAccesses: [graphAccess],
      })
    : undefined;

  const wiki = Deployment({
    name,
    namespace,
    provider,

    secrets: {
      DB_TYPE: 'postgres',
      DB_PORT: '5432',
      DB_HOST: postgresql.host,
      DB_USER: postgresql.username,
      DB_PASS: postgresql.password,
      DB_NAME: postgresql.database,
    },

    podConfig: {
      port: 3000,
      image: 'requarks/wiki:latest',
      podSecurityContext: { readOnlyRootFilesystem: false },
    },

    deploymentConfig: {
      replicas: 1,
      useVirtualHost,
    },

    ingressConfig: ingress
      ? {
          ...ingress,
          hostNames: [hostName],
          responseHeaders: {
            'Content-Security-Policy': `default-src 'self' *.diagrams.net *.msecnd.net *.services.visualstudio.com data: 'unsafe-inline' 'unsafe-eval'`,
            'referrer-policy': 'no-referrer',
          },
        }
      : undefined,
  });

  return { wiki, identity };
};
