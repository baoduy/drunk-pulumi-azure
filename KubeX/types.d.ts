import { Provider } from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

export interface K8sArgs {
  provider: Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export interface DefaultK8sArgs extends K8sArgs {
  name: string;
  namespace: Input<string>;
}
