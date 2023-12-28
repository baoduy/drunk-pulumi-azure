import { Provider } from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import { IngressTypes } from './Deployment';
import { CertManagerIssuerTypes } from './Ingress/type';
import { StorageClassNameTypes } from './Storage';
import { KeyVaultInfo } from '../types';
import { RunAsType } from './Core/StorageClass/azureFile';

export interface K8sArgs {
  provider: Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export type K8sResourceType = {
  limits?: { memory: string; cpu: string };
  requests?: { memory: string; cpu: string };
};

export interface DefaultK8sArgs extends K8sArgs {
  name?: string;
  namespace: Input<string>;

  resources?: K8sResourceType;
}

export interface DefaultKsAppArgs extends DefaultK8sArgs {
  runAs?: RunAsType;
  ingress?: {
    type: IngressTypes;
    hostNames: string[];
    allowHttp?: boolean;
    certManagerIssuer?: CertManagerIssuerTypes;
  };
}

type AuthType = { rootPass?: Input<string> };

export interface PostgreSqlProps extends Omit<DefaultK8sArgs, 'name'> {
  name?: string;
  vaultInfo?: KeyVaultInfo;
  auth?: AuthType;
  storageClassName: StorageClassNameTypes;
}

export interface MySqlProps extends PostgreSqlProps {
  version?: string;
  customPort?: number;
  useClusterIP?: boolean;
}
