import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import { applyDeploymentRules } from '../Core/SecurityRules';

interface Props {
  namespace: Input<string>;
  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({ namespace, provider, dependsOn }: Props) => {
  const name = 'kube-cleanup-operator';

  new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'kube-cleanup-operator',
      fetchOpts: {
        repo: 'http://charts.lwolf.org',
      },

      values: {
        rbac: {
          global: true,
        },
        args: [
          //'--namespace=default',
          '--delete-successful-after=24h0m0s',
          '--delete-failed-after=0',
          '--delete-pending-pods-after=0',
          '--delete-evicted-pods-after=0',
          '--delete-orphaned-pods-after=0',
          //'--ignore-owned-by-cronjobs=false',
          //'--dry-run=false',
          '--legacy-mode=false',
        ],
      },

      transformations: [
        (obj: any) =>
          applyDeploymentRules(obj, { disableServiceAccount: false }),
      ],
    },
    { provider, dependsOn }
  );
};
