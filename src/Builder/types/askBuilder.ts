//AKS Builder types
import * as native from "@pulumi/azure-native";
import { SshGenerationProps, SshResults } from "../../Core/KeyGenetators";
import { IBuilderAsync } from "./genericBuilder";
import {
  AksAccessProps,
  AksNetworkProps,
  AksNodePoolProps,
  AksResults,
  AskAddonProps,
  AskFeatureProps,
  DefaultAksNodePoolProps,
} from "../../Aks";

export type AskBuilderResults = {
  ssh: SshResults;
  aks: AksResults;
};
export type SshBuilderProps = Omit<SshGenerationProps, "vaultInfo" | "name">;
export type AksImportProps = { id: string; ignoreChanges?: string[] };

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
export interface IAksBuilder extends IBuilderAsync<AskBuilderResults> {
  withAuth(props: Omit<AksAccessProps, "envRoles">): IAksBuilder;
  withNodePool(props: AksNodePoolProps): IAksBuilder;
  withAddon(props: AskAddonProps): IAksBuilder;
  withFeature(props: AskFeatureProps): IAksBuilder;
  withTier(tier: native.containerservice.ManagedClusterSKUTier): IAksBuilder;
  import(props: AksImportProps): IAksBuilder;
}
