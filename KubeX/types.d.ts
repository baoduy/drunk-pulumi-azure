import { Provider } from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import { IngressTypes } from './Deployment';
import { CertManagerIssuerTypes } from './Ingress/type';

export interface K8sArgs {
  provider: Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export interface DefaultK8sArgs extends K8sArgs {
  name: string;
  namespace: Input<string>;
}

export interface DefaultKsAppArgs extends DefaultK8sArgs {
  ingress?: {
    type: IngressTypes;
    domain: string;
    certManagerIssuer?: CertManagerIssuerTypes;
  };
}
