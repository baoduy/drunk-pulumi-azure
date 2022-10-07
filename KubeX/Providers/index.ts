import { DefaultK8sArgs } from '../types.d';
import * as k8s from '@pulumi/kubernetes';
import { getK8sProviderName } from '../../Common/Naming';

interface Props extends Omit<DefaultK8sArgs, 'provider' | 'namespace'> {
  namespace?: string;
  kubeconfig: string;
}

export const createProvider = ({ name, ...others }: Props) => {
  name = getK8sProviderName(name);
  return new k8s.Provider(name, others);
};
