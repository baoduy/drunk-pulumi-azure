import { DefaultAksArgs } from '../types.d';
import * as k8s from '@pulumi/kubernetes';
import { getK8sProviderName } from '../../Common/Naming';
import { getAksConfig } from '../../Aks/Helper';
import { ResourceGroupInfo } from '../../types';

interface Props extends Omit<DefaultAksArgs, 'provider' | 'namespace'> {
  namespace?: string;
  kubeconfig: string;
}

export const createProvider = ({ name, ...others }: Props) => {
  name = getK8sProviderName(name);
  return new k8s.Provider(name, others);
};

interface AksProps {
  aksName: string;
  namespace?: string;
  group: ResourceGroupInfo;
}

export const createAksProvider = async ({
  aksName,
  namespace,
  group,
}: AksProps) =>
  createProvider({
    name: aksName,
    namespace,
    kubeconfig: await getAksConfig({
      name: aksName,
      groupName: group.resourceGroupName,
    }),
  });
