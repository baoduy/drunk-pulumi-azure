import { DefaultKsAppArgs } from '../types';
import Deployment from '../Deployment';
import { Input } from '@pulumi/pulumi';
import Identity from '../../AzAd/Identity';
import { KeyVaultInfo } from '../../types';
import { getGraphPermissions } from '../../AzAd/GraphDefinition';

export interface NobeliumProps extends DefaultKsAppArgs {
  notionPageId: Input<string>;
  googleSiteVerification?: Input<string>;
  googleAnalyticId?: Input<string>;
}

export default ({
  name = 'nobelium',
  namespace,
  ingress,
  provider,
  notionPageId,
  googleAnalyticId,
  googleSiteVerification,
}: //notionToken,
NobeliumProps) => {
  const configMap: any = { NOTION_PAGE_ID: notionPageId };
  if (googleAnalyticId) configMap['GG_ANALYTIC_ID'] = googleAnalyticId;
  if (googleSiteVerification)
    configMap['GG_SITE_VERIFICATION'] = googleSiteVerification;

  return Deployment({
    name,
    namespace,
    provider,

    configMap,

    podConfig: {
      port: 3000,
      image: 'baoduy2412/nobelium:latest',
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
