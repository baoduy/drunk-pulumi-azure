import * as k8s from '@pulumi/kubernetes';
import Namespace from './Namespace';
import Nginx from './Nginx';
import Monitoring, { MonitoringProps } from './Monitoring';
import CertManager, { CertManagerProps } from './CertManager';
import { Input, Resource } from '@pulumi/pulumi';
import StorageClass, { StorageClassProps } from './StorageClass';

interface NginxItemProps {
  name: string;
  publicIpAddress?: string;
  /**Use this in case the ingress behind a firewall*/
  internalIpAddress?: string;

  /**Expose TCP Ports {port: dnsName} */
  tcp?: { [key: number]: string };
  /**Expose UDP ports  {port: dnsName} */
  udp?: { [key: number]: string };
}

interface NginxProps {
  namespace: string;
  version?: string;
  replicaCount?: number;
  vnetResourceGroup?: string;
  internalIngress?: boolean;
  public?: NginxItemProps & { forceUseIngressClass?: boolean };
  private?: Omit<NginxItemProps, 'publicIpAddress'>;
}

interface Props {
  namespaces: Array<{
    name: string;
    labels?: {
      [key: string]: string;
    };
  }>;
  nginx?: NginxProps;
  monitoring?: Omit<MonitoringProps, 'provider' | 'dependsOn'>;
  certManager?: Omit<CertManagerProps, 'namespace' | 'provider' | 'dependsOn'>;
  storageClasses?: {
    [key: string]: Omit<StorageClassProps, 'provider' | 'name'>;
  };
  enableStaticIpEgress?: { publicIpAddress?: Input<string> };
  provider: k8s.Provider;
}

export default ({
  namespaces,
  provider,
  nginx,
  monitoring,
  certManager,
  storageClasses,
}: Props) => {
  //Create Namespaces
  const namespacesList = namespaces.map((n) => Namespace({ ...n, provider }));
  const resources = new Array<Resource>();

  if (nginx) {
    const rs = nginxCreator({ ...nginx, provider });
    if (rs.publicIngress) resources.push(rs.publicIngress);
    if (rs.privateIngress) resources.push(rs.privateIngress);
  }

  if (monitoring) {
    const ns = Namespace({ name: monitoring.namespace, provider });
    resources.push(Monitoring({ ...monitoring, provider, dependsOn: ns }));
  }

  if (storageClasses) {
    Object.keys(storageClasses).forEach((k) => {
      const c = storageClasses[k];
      if (!c) return undefined;
      return StorageClass({ name: k, provider, ...c });
    });
  }

  if (certManager) {
    resources.push(
      CertManager({
        ...certManager,
        provider,
      })
    );
  }

  return { namespacesList, resources };
};

const nginxCreator = ({
  namespace,
  version,
  replicaCount,
  vnetResourceGroup,
  provider,
  internalIngress,
  ...info
}: NginxProps & {
  provider: k8s.Provider;
}) => {
  //Namespace
  const ns = Namespace({ name: namespace, provider });
  let privateIngress: Resource | undefined;
  let publicIngress: Resource | undefined;

  if (info.public) {
    //Public
    publicIngress = Nginx({
      name: info.public.name,
      version,
      namespace,
      replicaCount,

      useIngressClassOnly:
        info.public.forceUseIngressClass || info.private !== undefined,

      tcp: info.public.tcp,
      udp: info.public.udp,

      network: {
        internalIngress,
        vnetResourceGroup,
        loadBalancerIP:
          info.public.publicIpAddress || info.public.internalIpAddress,
      },
      provider,
      dependsOn: ns,
    });
  }

  if (info.private) {
    //Private
    privateIngress = Nginx({
      name: info.private.name,
      version,
      namespace,
      useIngressClassOnly: true,

      tcp: info.private.tcp,
      udp: info.private.udp,

      network: {
        internalIngress,
        vnetResourceGroup,
        loadBalancerIP: info.private.internalIpAddress,
      },
      provider,
      dependsOn: ns,
    });
  }

  return { publicIngress, privateIngress };
};
