//https://docs.k3s.io/upgrades/automated

import { K8sArgs } from '../../../types';
import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';

interface Props extends K8sArgs {
  enableWorkerPlan?: boolean;
}

interface PlanProps extends K8sArgs {
  name: string;
  namespace: Input<string>;
  isServerPlan?: boolean;
}
const createPlan = ({
  name,
  namespace,
  isServerPlan,
  ...others
}: PlanProps) => {
  new k8s.apiextensions.CustomResource(
    name,
    {
      kind: 'Plan',
      apiVersion: 'upgrade.cattle.io/v1',
      metadata: { name, namespace },
      spec: {
        concurrency: 1,
        cordon: true,
        serviceAccountName: 'system-upgrade',
        upgrade: { image: 'rancher/k3s-upgrade' },
        channel: 'https://update.k3s.io/v1-release/channels/stable',

        prepare: isServerPlan
          ? undefined
          : { args: ['prepare', 'server-plan'], image: 'rancher/k3s-upgrade' },
        nodeSelector: {
          matchExpressions: [
            isServerPlan
              ? {
                  key: 'node-role.kubernetes.io/master',
                  operator: 'In',
                  values: ['true'],
                }
              : {
                  key: 'node-role.kubernetes.io/master',
                  operator: 'DoesNotExist',
                },
          ],
        },
      },
    },
    others
  );
};

export default ({ enableWorkerPlan, ...others }: Props) => {
  const name = 'k3s-auto-upgrade-controller';

  const controller = new k8s.yaml.ConfigFile(
    name,
    {
      skipAwait: true,
      file: 'https://github.com/rancher/system-upgrade-controller/releases/latest/download/system-upgrade-controller.yaml',
    },
    others
  );

  createPlan({
    name: 'server-plan',
    namespace: 'system-upgrade',
    isServerPlan: true,
    ...others,
    dependsOn: controller,
  });

  if (enableWorkerPlan) {
    createPlan({
      name: 'agent-plan',
      namespace: 'system-upgrade',
      isServerPlan: false,
      ...others,
      dependsOn: controller,
    });
  }
};
