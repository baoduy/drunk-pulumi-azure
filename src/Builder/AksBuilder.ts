import {
  AksBuilderProps,
  AksImportProps,
  AskBuilderResults,
  IAksBuilder,
  IAksDefaultNodePoolBuilder,
  IAksNetworkBuilder,
  IAskAuthBuilder,
  ISshBuilder,
  ResourcesBuilderAsync,
  SshBuilderProps,
} from "./types";
import { generateSsh, SshResults } from "../Core/KeyGenetators";
import { ManagedClusterSKUTier } from "@pulumi/azure-native/containerservice";
import Aks, {
  AksNodePoolProps,
  AskAddonProps,
  AskFeatureProps,
  AksAccessProps,
  AksNetworkProps,
  DefaultAksNodePoolProps,
  AksResults,
} from "../Aks";

class AksBuilder
  extends ResourcesBuilderAsync<AskBuilderResults>
  implements
    ISshBuilder,
    IAskAuthBuilder,
    IAksNetworkBuilder,
    IAksDefaultNodePoolBuilder,
    IAksBuilder
{
  //Instances
  private _sshInstance: SshResults | undefined = undefined;
  private _askInstance: AksResults | undefined = undefined;

  //Props
  private _sshProps: SshBuilderProps | undefined = undefined;
  private _nodePoolsProps: AksNodePoolProps[] = [];
  private _addonProps: AskAddonProps | undefined = undefined;
  private _featureProps: AskFeatureProps | undefined = undefined;
  private _authProps: AksAccessProps | undefined = undefined;
  private _tier: ManagedClusterSKUTier = ManagedClusterSKUTier.Free;
  private _networkProps: AksNetworkProps | undefined = undefined;
  private _defaultNode: DefaultAksNodePoolProps | undefined = undefined;
  private _importProps: AksImportProps | undefined = undefined;

  constructor({ ...others }: AksBuilderProps) {
    super(others);
  }

  //Info collection methods
  public withNewSsh(props: SshBuilderProps): IAskAuthBuilder {
    this._sshProps = props;
    return this;
  }

  public withNodePool(props: AksNodePoolProps): IAksBuilder {
    this._nodePoolsProps.push(props);
    return this;
  }
  public withAddon(props: AskAddonProps): IAksBuilder {
    this._addonProps = props;
    return this;
  }
  public withFeature(props: AskFeatureProps): IAksBuilder {
    this._featureProps = props;
    return this;
  }
  public withAuth(props: AksAccessProps): IAksNetworkBuilder {
    this._authProps = props;
    return this;
  }
  public withTier(tier: ManagedClusterSKUTier): IAksBuilder {
    this._tier = tier;
    return this;
  }
  public withNetwork(props: AksNetworkProps): IAksDefaultNodePoolBuilder {
    this._networkProps = props;
    return this as IAksDefaultNodePoolBuilder;
  }
  public withDefaultNodePool(props: DefaultAksNodePoolProps): IAksBuilder {
    this._defaultNode = props;
    return this as IAksBuilder;
  }
  public import(props: AksImportProps) {
    this._importProps = props;
    return this;
  }
  //Build Methods
  private buildSsh() {
    this._sshInstance = generateSsh({
      ...this.commonProps,
      ...this._sshProps,
    });
  }

  private async buildAsk() {
    const sshKey = this._sshInstance!.lists.getPublicKey();

    this._askInstance = await Aks({
      ...this.commonProps,
      addon: this._addonProps,
      aksAccess: this._authProps!,
      tier: this._tier,
      linux: {
        adminUsername: this._sshInstance!.userName,
        sshKeys: [sshKey],
      },
      defaultNodePool: this._defaultNode!,
      nodePools: this._nodePoolsProps,
      features: this._featureProps,
      network: this._networkProps!,

      importFrom: this._importProps?.id,
      ignoreChanges: this._importProps?.ignoreChanges,
      //nodeResourceGroup: getResourceGroupName(""),
    });
  }

  public async build(): Promise<AskBuilderResults> {
    this.buildSsh();
    await this.buildAsk();
    return { ssh: this._sshInstance!, aks: this._askInstance! };
  }
}

export default (props: AksBuilderProps) => new AksBuilder(props) as ISshBuilder;
