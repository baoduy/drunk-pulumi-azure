import { DefaultKsAppArgs } from '../types';
import Deployment from '../Deployment';
import { Input } from '@pulumi/pulumi';
import Identity from '../../AzAd/Identity';
import { KeyVaultInfo } from '../../types';
import { getGraphPermissions } from '../../AzAd/GraphDefinition';

export interface AstroPageProps extends DefaultKsAppArgs {
  googleSiteVerification?: Input<string>;
  //googleAnalyticId?: Input<string>;
}

export default ({
  name = 'astro-page',
  namespace,
  ingress,
  provider,
  googleSiteVerification,
}: //notionToken,
AstroPageProps) => {
  const configMap: any = {};
  if (googleSiteVerification)
    configMap['PUBLIC_GOOGLE_SITE_VERIFICATION'] = googleSiteVerification;

  return Deployment({
    name,
    namespace,
    provider,

    configMap,

    podConfig: {
      port: 80,
      image: 'baoduy2412/astro-blog:latest',
      imagePullPolicy: 'Always',
      //podSecurityContext: { readOnlyRootFilesystem: false },
    },

    deploymentConfig: {
      replicas: 1,
    },

    ingressConfig: ingress
      ? {
          ...ingress,
          responseHeaders: {
            'Content-Security-Policy': `default-src 'self' https://*.notion.so https://*.googletagmanager.com https://cusdis.com data: 'unsafe-inline' 'unsafe-eval';`,
            'referrer-policy': 'no-referrer',
          },
        }
      : undefined,
  });
};
