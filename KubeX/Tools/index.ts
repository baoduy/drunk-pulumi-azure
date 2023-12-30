import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import KubeCleanup from './KubeCleanup';
import ToolPod, { ToolPodProps } from './ToolPod';
import SqlPad, { SqlPadProps } from './SqlPad';
import OutlineVpn, { OutlineProps } from './OutlineVpn';
import NoIp, { NoIpProps } from './NoIp';
import AppHealthMonitor, { AppHealthMonitorProps } from './AppHealthzMonitor';
import UptimeKuma, { UptimeKumaProps } from './UptimeKuma';
import OpenLDAP, { OpenLDAPProps } from './OpenLDAP';
import HelloWorld from './HelloWorld';
import EchoApp from './Echo-App';
import { DefaultKsAppArgs } from '../types';

interface Props {
  namespace: Input<string>;
  provider: k8s.Provider;

  helloWorld?: Omit<DefaultKsAppArgs, 'namespace' | 'provider' | 'dependsOn'>;
  echo?: Omit<DefaultKsAppArgs, 'namespace' | 'provider' | 'dependsOn'>;

  noIp?: Omit<NoIpProps, 'namespace' | 'provider' | 'dependsOn'>;
  sqlPad?: Omit<SqlPadProps, 'namespace' | 'provider' | 'dependsOn'>;
  toolPod?: Omit<ToolPodProps, 'namespace' | 'provider' | 'dependsOn'>;
  outlineVpn?: Omit<OutlineProps, 'provider' | 'dependsOn'>;
  openLdap?: Omit<OpenLDAPProps, 'provider' | 'dependsOn'>;
  appHealthMonitor?: Omit<
    AppHealthMonitorProps,
    'namespace' | 'provider' | 'dependsOn'
  >;
  uptimeKuma?: Omit<UptimeKumaProps, 'namespace' | 'provider' | 'dependsOn'>;

  enableKubeCleanup?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default async ({
  helloWorld,
  echo,

  enableKubeCleanup,
  toolPod,
  noIp,
  sqlPad,
  outlineVpn,
  openLdap,
  appHealthMonitor,
  uptimeKuma,
  namespace,
  ...others
}: Props) => {
  if (helloWorld) HelloWorld({ namespace, ...others, ...helloWorld });
  if (echo) EchoApp({ namespace, ...others, ...echo });

  if (enableKubeCleanup) KubeCleanup({ namespace, ...others });
  if (toolPod) ToolPod({ namespace, ...others, ...toolPod });
  if (noIp) NoIp({ namespace, ...others, ...noIp });
  if (sqlPad) await SqlPad({ namespace, ...others, ...sqlPad });
  if (outlineVpn) await OutlineVpn({ ...others, ...outlineVpn });
  if (openLdap) OpenLDAP({ ...others, ...openLdap });
  if (appHealthMonitor)
    AppHealthMonitor({ namespace, ...others, ...appHealthMonitor });
  if (uptimeKuma) UptimeKuma({ namespace, ...others, ...uptimeKuma });
};
