import { CertArgs } from '@drunk-pulumi/azure-providers';
import { KeyVaultInfo, WithNamedType } from '../../types';
import { Input } from '@pulumi/pulumi';
import { BuilderProps } from './genericBuilder';

export type VaultBuilderArgs = Omit<BuilderProps, 'vaultInfo'>;
export type VaultBuilderSecretType = Record<string, Input<string>> | string;
export type CertBuilderType = WithNamedType & {
  cert: CertArgs;
};
export interface IVaultBuilderResults extends KeyVaultInfo {
  info(): KeyVaultInfo;
  /**Add secrets to vault. If parameter is a string the secret will be loaded from project secret*/
  addSecrets(items: VaultBuilderSecretType): IVaultBuilderResults;
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
