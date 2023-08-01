import { DefaultK8sArgs } from '../types';
import * as k8s from '@pulumi/kubernetes';
import { getK8sProviderName } from '../../Common/Naming';

interface Props extends Omit<DefaultK8sArgs, 'provider' | 'namespace'> {
  namespace?: string;
  ignoreChanges?: boolean;
  kubeconfig: string;
}

export const createProvider = ({
  name = 'ks-provider',
  ignoreChanges,
  ...others
}: Props) => {
  name = getK8sProviderName(name);
  return new k8s.Provider(
    name,
    {
      ...others,
      suppressDeprecationWarnings: true,
      suppressHelmHookWarnings: true,
    },
    { ignoreChanges: ignoreChanges ? ['kubeconfig'] : undefined }
  );
};
