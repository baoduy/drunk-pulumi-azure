import { Input } from '@pulumi/pulumi';

export interface ServicePort {
  appProtocol?: Input<string>;
  name?: Input<string>;
  nodePort?: Input<number>;
  port: Input<number>;
  protocol?: Input<string>;
  targetPort?: Input<number | string>;
}
