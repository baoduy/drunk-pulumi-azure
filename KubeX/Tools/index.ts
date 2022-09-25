import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import HelloWorldApp, { HelloAppProps } from './HelloWorldApp';
import KubeCleanup from './KubeCleanup';
import ToolPod, { ToolPodProps } from './ToolPod';
import SqlPad, { SqlPadProps } from './SqlPad';

interface Props {
  namespace: Input<string>;
  provider: k8s.Provider;

  helloWorld?: Omit<HelloAppProps, 'namespace' | 'provider' | 'dependsOn'>;
  sqlPad?: Omit<SqlPadProps, 'namespace' | 'provider' | 'dependsOn'>;

  toolPod?: Omit<ToolPodProps, 'namespace' | 'provider' | 'dependsOn'>;
  enableKubeCleanup?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default async ({
  helloWorld,
  enableKubeCleanup,
  toolPod,
  sqlPad,
  ...others
}: Props) => {
  if (helloWorld) await HelloWorldApp({ ...others, ...helloWorld });
  if (enableKubeCleanup) KubeCleanup(others);
  if (toolPod) ToolPod({ ...others, ...toolPod });
  if (sqlPad) await SqlPad({ ...others, ...sqlPad });
};
