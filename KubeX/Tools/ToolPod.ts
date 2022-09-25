import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import {
  defaultPodSecurityContext,
  defaultSecurityContext,
} from '../Core/SecurityRules';
import { virtualHostConfig } from '../Deployment';

export interface ToolPodProps {
  namespace: Input<string>;
  provider: k8s.Provider;
  useVirtualHost?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}
export default ({ namespace, useVirtualHost, ...others }: ToolPodProps) => {
  const name = 'tool-pod';
  const image = 'aguasjmsft/toolpod';

  new k8s.apps.v1.Deployment(
    name,
    {
      metadata: { name, namespace },
      spec: {
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            securityContext: defaultSecurityContext,
            automountServiceAccountToken: false,
            containers: [
              {
                name,
                image,
                securityContext: defaultPodSecurityContext,
              },
            ],

            nodeSelector: useVirtualHost
              ? virtualHostConfig.nodeSelector
              : undefined,
            tolerations: useVirtualHost
              ? virtualHostConfig.tolerations
              : undefined,
          },
        },
      },
    },
    others
  );
};
