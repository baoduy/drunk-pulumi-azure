import { K8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';
import Namespace from '../../Core/Namespace';
import { DaprStorage } from './Storage';
import Storage from './Storage';
import { isLocal, isDev } from '../../../Common/AzureEnv';

interface Props extends K8sArgs {
  name?: string;
  //namespace?: string;
  version?: string;
  storage: DaprStorage;
}

export default async ({
  name = 'dapr',
  version = '1.10',
  storage,
  provider,
  dependsOn,
}: Props) => {
  const ns = Namespace({ name: 'dapr-system', provider, dependsOn });

  const dapr = new k8s.helm.v3.Chart(
    name,
    {
      namespace: ns.metadata.name,
      chart: 'dapr',
      //version,
      fetchOpts: { repo: 'https://dapr.github.io/helm-charts' },
      skipAwait: true,

      values: {
        global: {
          //tag: `${version}-mariner`,
          ha: { enabled: !isLocal && !isDev },
        },
      },
    },
    { dependsOn: ns, provider }
  );

  Storage({
    name: `${name}-storage`,
    namespace: ns.metadata.name,
    storage,
    provider,
    dependsOn: dapr,
  });

  return dapr;
};
