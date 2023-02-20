import { K8sArgs } from '../../types';
import Namespace from '../../Core/Namespace';
import { KeyVaultInfo } from '../../../types';
import { certImportFromVault, certImportFromFolder } from '../../CertImports';

interface Props extends K8sArgs {
  vaultInfo?: KeyVaultInfo;
  certVaultName?: string;
  certFolderName?: string;
}

export default async ({
  vaultInfo,
  certVaultName,
  certFolderName,
  ...others
}: Props) => {
  const name = 'outline-vpn';
  const namespace = 'outline-system';

  const ns = Namespace({ name: namespace, ...others });

  if (certVaultName && vaultInfo) {
    await certImportFromVault({
      certNames: [certVaultName],
      vaultInfo,
      namespace,
      dependsOn: ns,
      provider: others.provider,
    });
  } else if (certFolderName) {
    await certImportFromFolder({
      certName: name,
      certFolder: certFolderName,
      namespaces: [namespace],
      dependsOn: ns,
      provider: others.provider,
    });
  }
};
