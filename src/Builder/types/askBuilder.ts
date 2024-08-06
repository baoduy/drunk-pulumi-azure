//AKS Builder types
import * as cs from '@pulumi/azure-native/containerservice';
import { SshGenerationProps } from '../../Core/KeyGenerators';
import { IBuilderAsync } from './genericBuilder';
import {
  AksAccessProps,
  AksNetworkProps,
  AksNodePoolProps,
  AksResults,
  AskAddonProps,
  AskFeatureProps,
  DefaultAksNodePoolProps,
} from '../../Aks';
import { WithVmEncryption } from '../../types';

export type SshBuilderProps = Omit<SshGenerationProps, 'vaultInfo' | 'name'>;
export type AksImportProps = { id: string; ignoreChanges?: string[] };
export type AksEncryptionType = Required<WithVmEncryption>;

export interface ISshBuilder {
  withNewSsh(props: SshBuilderProps): IAksNetworkBuilder;
  //withExistingSsh: (props: {vaultSecretName:string}) => IAskAuthBuilder;
}
export interface IAksNetworkBuilder {
  withNetwork(props: AksNetworkProps): IAksDefaultNodePoolBuilder;
}
export interface IAksDefaultNodePoolBuilder {
  withDefaultNodePool(props: DefaultAksNodePoolProps): IAksBuilder;
}
export interface IAksBuilder extends IBuilderAsync<AksResults> {
  withAuth(props: Omit<AksAccessProps, 'envRoles'>): IAksBuilder;
  withNodePool(props: AksNodePoolProps): IAksBuilder;
  withAddon(props: AskAddonProps): IAksBuilder;
  withFeature(props: AskFeatureProps): IAksBuilder;
  withTier(tier: cs.ManagedClusterSKUTier): IAksBuilder;
  /** This must be enabled before resource be created*/
  enableEncryption(props: AksEncryptionType): IAksBuilder;
  import(props: AksImportProps): IAksBuilder;
  lock(): IBuilderAsync<AksResults>;
}
