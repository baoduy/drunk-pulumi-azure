import { DefaultK8sArgs } from '../types';
import * as k8s from '@pulumi/kubernetes';

interface Props extends DefaultK8sArgs {}

export default ({ name = 'kafka', namespace, provider }: Props) => {
  const kafka = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'kafka',
      fetchOpts: { repo: 'https://charts.bitnami.com/bitnami' },

      values: {},
    },
    { provider }
  );

  return kafka;
};
