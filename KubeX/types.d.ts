import { Provider } from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';

export interface DefaultAksArgs {
  name: string;
  namespace: Input<string>;
  provider: Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}
