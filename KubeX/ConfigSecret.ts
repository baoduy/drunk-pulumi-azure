import { DefaultAksArgs } from './types';
import * as pulumi from '@pulumi/pulumi';
import * as kx from './index';
import { Input } from '@pulumi/pulumi';

interface Props extends DefaultAksArgs {
  fixedName?: boolean;
  configMap?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
  secrets?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
}

export const ConfigSecret = ({
  name,
  namespace,
  fixedName,
  configMap,
  secrets,
  provider,
  dependsOn,
}: Props) => {
  const configMapName = `${name}-configmap`;
  const secretName = `${name}-secret`;

  const result: { config?: kx.ConfigMap; secret?: kx.Secret } = {
    config: undefined,
    secret: undefined,
  };

  if (configMap) {
    //Create ConfigMaps
    result.config = new kx.ConfigMap(
      configMapName,
      {
        metadata: { name: fixedName ? configMapName : undefined, namespace },
        data: configMap,
      },
      { provider, dependsOn }
    );
  }

  if (secrets) {
    //Create Secrets
    result.secret = new kx.Secret(
      secretName,
      {
        metadata: { name: fixedName ? secretName : undefined, namespace },
        stringData: secrets,
      },
      { provider, dependsOn }
    );
  }

  return result;
};

interface AzureStorageSecret extends DefaultAksArgs {
  fixedName?: boolean;
  accountKey: Input<string>;
  accountName: Input<string>;
}

export const AksAzureStorageSecret = ({
  accountKey,
  accountName,
  ...props
}: AzureStorageSecret) =>
  ConfigSecret({
    ...props,
    secrets: {
      azurestorageaccountkey: accountKey,
      azurestorageaccountname: accountName,
    },
  }).secret!;

export default ConfigSecret;
