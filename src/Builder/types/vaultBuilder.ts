import { CertArgs } from '@drunk-pulumi/azure-providers';
import { KeyVaultInfo, WithNamedType } from '../../types';
import { Input } from '@pulumi/pulumi';
import { BuilderProps } from './genericBuilder';

export type VaultBuilderArgs = Omit<BuilderProps, 'vaultInfo'>;
export type CertBuilderType = WithNamedType & {
  cert: CertArgs;
};
export interface IVaultBuilderResults extends KeyVaultInfo {
  info(): KeyVaultInfo;

  addSecrets(items: Record<string, Input<string>>): IVaultBuilderResults;
  //addKeys () : IVaultBuilderResults;
  addCerts(items: Record<string, CertBuilderType>): IVaultBuilderResults;
  privateLinkTo(subnetIds: Input<string>[]): IVaultBuilderResults;
  linkTo(props: {
    subnetIds: Input<string>[];
    ipAddresses: Input<string>[];
  }): IVaultBuilderResults;
}

export interface IVaultBuilder {
  //withDiagnostic(logInfo: BasicMonitorArgs): IVaultBuilder;
  build(): IVaultBuilderResults;
}
