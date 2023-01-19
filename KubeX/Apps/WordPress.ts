import { DefaultK8sArgs } from '../types';
import { Input } from '@pulumi/pulumi';
import Deployment from '../Deployment';
import { createPVCForStorageClass } from '../Storage';
import { getRootDomainFromUrl } from '../../Common/Helpers';
interface Props extends DefaultK8sArgs {
  hostNames: string[];
  volume?: {
    storageClass: string;
  };
  database: {
    host: Input<string>;
    username: Input<string>;
    password: Input<string>;
    database: Input<string>;
    requiredSSL?: boolean;
  };
  options?: { enableDebug?: boolean };
}

export default ({
  name = 'wp',
  namespace,
  hostNames,
  volume,
  database,
  provider,
  options = {},
}: Props) => {
  const claim = volume
    ? createPVCForStorageClass({
        name,
        namespace,
        provider,
        storageClassName: volume.storageClass,
      })
    : undefined;

  const domains = getRootDomainFromUrl(hostNames[0]);

  return Deployment({
    name,
    namespace,
    configMap: { WORDPRESS_DEBUG: options.enableDebug ? '1' : '' },
    secrets: {
      WORDPRESS_DB_HOST: database.host,
      WORDPRESS_DB_USER: database.username,
      WORDPRESS_DB_PASSWORD: database.password,
      WORDPRESS_DB_NAME: database.database,
      WORDPRESS_CONFIG_EXTRA: database.requiredSSL
        ? "define('MYSQL_CLIENT_FLAGS', MYSQLI_CLIENT_SSL);"
        : '',
    },
    podConfig: {
      port: 80,
      image: 'wordpress:latest',
      volumes: volume
        ? [
            {
              name: 'data-wp',
              persistentVolumeClaim: claim!.metadata.name,
              mountPath: '/var/www/html',
            },
          ]
        : undefined,
    },
    deploymentConfig: { replicas: 1 },
    ingressConfig: {
      type: 'nginx',
      certManagerIssuer: true,
      hostNames: hostNames,
      responseHeaders: {
        'Content-Security-Policy': `default-src 'self' ${hostNames.concat(
          ' '
        )} *.githubusercontent.com codesandbox.io *.gravatar.com *.wp.com *.w.org wp-themes.com *.rating-widget.com rating-widget.com *.googleapis.com *.googletagmanager.com *.gstatic.com *.google.com *.cloudflare.com data: 'unsafe-inline' 'unsafe-eval'; frame-src *.${domains} wp-themes.com codesandbox.io *.google.com;`,
        'referrer-policy': 'no-referrer',
      },
    },
    provider,
  });
};
