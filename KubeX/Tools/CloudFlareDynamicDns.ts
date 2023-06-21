import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

import deployment from '../Deployment';

export interface CloudFlareDynamicDns {
  namespace: Input<string>;
  apiKey: Input<string>;
  zones: Array<{
    id: Input<string>;
    aRecords: string[];
  }>;

  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({
  namespace,
  apiKey, zones,

  ...others
}: CloudFlareDynamicDns) => {
  const name = 'cloudflare-ddns';
  const image = 'baoduy2412/cloudflare-ddns:latest';

  const config:any = {};

  zones.forEach(((z,index)=>{
    config[`Cloudflare__Zones__${index}__Id`] = z.id;
    z.aRecords.forEach((r,rI)=>config[`Cloudflare__Zones__${index}__ARecords__${rI}`] = r);
  }));

  deployment({
    name,
    namespace,

    configMap:config,
    secrets:{Cloudflare__ApiKey:apiKey},

    podConfig: {
      image,
      resources: { requests: { memory: '1Mi', cpu: '1m' } },
    },
    deploymentConfig: { replicas: 1 },

    ...others,
  });
};
