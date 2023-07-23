import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import KubeCleanup from './KubeCleanup';
import ToolPod, { ToolPodProps } from './ToolPod';
import SqlPad, { SqlPadProps } from './SqlPad';
import OutlineVpn, { OutlineProps } from './OutlineVpn';
import CloudFlareDDNS, { CloudFlareDynamicDns } from './CloudFlareDynamicDns';
import NoIp, { NoIpProps } from './NoIp';
import AppHealthMonitor, { AppHealthMonitorProps } from './AppHealthzMonitor';
import UptimeKuma, { UptimeKumaProps } from './UptimeKuma';
import HelloWorld, { HelloWorldProps } from './HelloWorld';

interface Props {
  namespace: Input<string>;
  provider: k8s.Provider;

  helloWorld?: Omit<HelloWorldProps, 'namespace' | 'provider' | 'dependsOn'>;
  noIp?: Omit<NoIpProps, 'namespace' | 'provider' | 'dependsOn'>;
  sqlPad?: Omit<SqlPadProps, 'namespace' | 'provider' | 'dependsOn'>;
  toolPod?: Omit<ToolPodProps, 'namespace' | 'provider' | 'dependsOn'>;
  outlineVpn?: Omit<OutlineProps, 'namespace' | 'provider' | 'dependsOn'>;
  appHealthMonitor?: Omit<
    AppHealthMonitorProps,
    'namespace' | 'provider' | 'dependsOn'
  >;
  uptimeKuma?: Omit<UptimeKumaProps, 'namespace' | 'provider' | 'dependsOn'>;

  cloudFlareDDNS?: Omit<
    CloudFlareDynamicDns,
    'namespace' | 'provider' | 'dependsOn'
  >;

  enableKubeCleanup?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default async ({
  helloWorld,
  enableKubeCleanup,
  toolPod,
  noIp,
  sqlPad,
  outlineVpn,
  cloudFlareDDNS,
  appHealthMonitor,
  uptimeKuma,
  ...others
}: Props) => {
  if (helloWorld) HelloWorld({ ...others, ...helloWorld });
  if (enableKubeCleanup) KubeCleanup(others);
  if (toolPod) ToolPod({ ...others, ...toolPod });
  if (noIp) NoIp({ ...others, ...noIp });
  if (sqlPad) await SqlPad({ ...others, ...sqlPad });
  if (outlineVpn) await OutlineVpn({ ...others, ...outlineVpn });
  if (cloudFlareDDNS) CloudFlareDDNS({ ...others, ...cloudFlareDDNS });
  if (appHealthMonitor)
    await AppHealthMonitor({ ...others, ...appHealthMonitor });
  if (uptimeKuma) UptimeKuma({ ...others, ...uptimeKuma });
};
