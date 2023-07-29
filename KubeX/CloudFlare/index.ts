import { K8sArgs } from '../types';
import Namespace from '../Core/Namespace';
import DynamicDns, { DynamicDnsProps } from './DynamicDns';
import Tunnel, { TunnelProps } from './Tunnel';
import CertImports, { CloudFlareCertImportProps } from './CertImports';

interface Props extends K8sArgs {
  namespace?: string;

  certImports?: Omit<
    CloudFlareCertImportProps,
    'namespace' | 'provider' | 'dependsOn'
  >;
  dynamicDns?: Omit<DynamicDnsProps, 'namespace' | 'provider' | 'dependsOn'>;
  tunnel?: Omit<TunnelProps, 'namespace' | 'provider' | 'dependsOn'>;
}

export default ({
  namespace = 'cloudflare',
  dynamicDns,
  tunnel,
  certImports,
  ...others
}: Props) => {
  const ns = Namespace({
    name: namespace,
    ...others,
  });

  if (certImports) CertImports({ ...others, ...certImports });
  if (dynamicDns)
    DynamicDns({ ...others, ...dynamicDns, namespace: ns.metadata.name });
  if (tunnel) Tunnel({ ...others, ...tunnel, namespace: ns.metadata.name });
};
