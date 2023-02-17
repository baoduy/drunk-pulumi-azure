import { DefaultK8sArgs, K8sArgs } from '../../types';
import { KeyVaultInfo } from '../../../types';
import { randomPassword } from '../../../Core/Random';
import { StorageClassNameTypes } from '../../Storage';
import * as k8s from '@pulumi/kubernetes';
import { addCustomSecret } from '../../../KeyVault/CustomHelper';
import { getPasswordName } from '../../../Common/Naming';
import { interpolate } from '@pulumi/pulumi';
import Namespace from '../../Core/Namespace';
import { DaprStorage } from './Storage';
import Storage from './Storage';

interface Props extends K8sArgs {
  name?: string;
  namespace?: string;
  version?: string;
  storage: DaprStorage;
}

export default async ({
  name = 'dapr',
  namespace = 'dapr-system',
  version = '1.10',
  storage,
  provider,
  dependsOn,
}: Props) => {
  const ns = Namespace({ name: namespace, provider, dependsOn });

  const dapr = new k8s.helm.v3.Chart(
    name,
    {
      namespace: ns.metadata.name,
      chart: 'dapr/dapr',
      version,
      fetchOpts: { repo: 'https://dapr.github.io/helm-charts' },
      skipAwait: true,

      values: {
        global: {
          tag: `${version}-mariner`,
          ha: { enabled: true },
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
