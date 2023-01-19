import { K8sArgs } from '../../types';
import Namespace from '../../Core/Namespace';
import * as k8s from '@pulumi/kubernetes';

interface Props extends K8sArgs {
  name?: string;
  namespace?: string;
}

export default ({
  name = 'argo-cd',
  namespace = 'argo-cd',
  ...others
}: Props) => {
  const ns = Namespace({ name, ...others });
  const argo = new k8s.yaml.ConfigFile(
    name,
    {
      skipAwait: true,
      file: 'https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml',
    },
    { dependsOn: ns, provider: others.provider }
  );

  return argo;
};
