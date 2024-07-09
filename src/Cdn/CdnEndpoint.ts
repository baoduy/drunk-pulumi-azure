import { Input } from '@pulumi/pulumi';
import * as native from '@pulumi/azure-native';
import CdnHttpsEnable from '@drunk-pulumi/azure-providers/CdnHttpsEnable';
import { subscriptionId } from '../Common/AzureEnv';
import {
  allowsCorsRules,
  enforceHttpsRule,
  getResponseHeadersRule,
  indexFileCacheRule,
} from './CdnRules';
import { cdnProfileInfo as globalCdnProfileInfo } from '../Common/GlobalEnv';
import { replaceAll } from '../Common/Helpers';
import { getCdnEndpointName } from '../Common';
import { BasicArgs, ResourceInfo } from '../types';

export interface CdnEndpointProps extends BasicArgs {
  name: string;
  origin: Input<string>;
  cors?: string[];
  domainName: string;
  httpsEnabled?: boolean;
  securityResponseHeaders?: Record<string, string>;
  cdnProfileInfo?: ResourceInfo;
}

export default ({
  name,
  domainName,
  origin,
  cors,
  httpsEnabled,
  securityResponseHeaders,
  cdnProfileInfo = globalCdnProfileInfo,
  dependsOn,
}: CdnEndpointProps) => {
  name = getCdnEndpointName(name);

  const rules = [enforceHttpsRule, indexFileCacheRule];
  if (securityResponseHeaders) {
    rules.push(getResponseHeadersRule(securityResponseHeaders));
  }
  if (cors) {
    rules.push(...allowsCorsRules(cors));
  }

  //Update rule order
  rules.forEach((r, i) => (r.order = i + 1));

  const endpoint = new native.cdn.Endpoint(
    name,
    {
      endpointName: name,
      ...cdnProfileInfo!.group,
      profileName: cdnProfileInfo!.name,

      origins: [{ name, hostName: origin }],
      originHostHeader: origin,

      optimizationType: 'GeneralWebDelivery',
      queryStringCachingBehavior: 'IgnoreQueryString',

      deliveryPolicy: {
        rules,
        description: 'Static Website Rules',
      },

      isCompressionEnabled: true,
      contentTypesToCompress: [
        'text/plain',
        'text/html',
        'text/xml',
        'text/css',
        'application/xml',
        'application/xhtml+xml',
        'application/rss+xml',
        'application/javascript',
        'application/x-javascript',
      ],

      isHttpAllowed: true,
      isHttpsAllowed: true,
    },
    { dependsOn },
  );

  if (domainName) {
    const customDomain = new native.cdn.CustomDomain(
      name,
      {
        endpointName: endpoint.name,
        ...cdnProfileInfo!.group,
        profileName: cdnProfileInfo!.name,
        customDomainName: replaceAll(domainName, '.', '-'),
        hostName: domainName,
      },
      { dependsOn: endpoint },
    );

    if (httpsEnabled) {
      new CdnHttpsEnable(
        name,
        {
          endpointName: endpoint.name,
          ...cdnProfileInfo!.group,
          profileName: cdnProfileInfo!.name,
          customDomainName: customDomain.name,
          subscriptionId,
        },
        { dependsOn: customDomain },
      );
    }
  }

  return endpoint;
};
