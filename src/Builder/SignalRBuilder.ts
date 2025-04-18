import {
  Builder,
  ISignalRBuilder,
  ISignalRKindBuilder,
  ISignalRSkuBuilder,
  SignalRBuilderArgs,
  SignalRKindBuilderType,
  SignalROptionsBuilder,
  SignalRSkuBuilderType,
} from './types';
import env from '../env';
import { PrivateLinkPropsType, ResourceInfo } from '../types';
import { naming } from '../Common';
import { Input } from '@pulumi/pulumi';
import * as ss from '@pulumi/azure-native/signalrservice';
import { addCustomSecrets } from '../KeyVault/CustomHelper';
import { SignalRPrivateLink } from '../VNet';

class SignalRBuilder
  extends Builder<ResourceInfo>
  implements ISignalRKindBuilder, ISignalRSkuBuilder, ISignalRBuilder
{
  private _signalRInstance: ss.SignalR | undefined = undefined;
  private readonly _instanceName: string;

  private _kind: SignalRKindBuilderType = 'SignalR';
  private _sku: SignalRSkuBuilderType = { name: 'Free_F1', tier: 'Free' };
  private _privateLink: PrivateLinkPropsType | undefined = undefined;
  private _origins: Input<string>[] | undefined = undefined;
  private _options: SignalROptionsBuilder | undefined = undefined;
  //private _features: SignalRFeatureArgs[] = [];

  constructor(private args: SignalRBuilderArgs) {
    super(args);
    this._instanceName = naming.getSignalRName(args.name);
  }

  public withKind(props: SignalRKindBuilderType): ISignalRSkuBuilder {
    this._kind = props;
    return this;
  }
  public withSku(props: SignalRSkuBuilderType): ISignalRBuilder {
    this._sku = props;
    return this;
  }
  public withPrivateLink(props: PrivateLinkPropsType): ISignalRBuilder {
    this._privateLink = props;
    return this;
  }
  public withPrivateLinkIf(
    condition: boolean,
    props: PrivateLinkPropsType,
  ): ISignalRBuilder {
    if (condition) this.withPrivateLink(props);
    return this;
  }
  public allowsOrigins(...props: Input<string>[]): ISignalRBuilder {
    this._origins = props;
    return this;
  }
  public withOptions(props: SignalROptionsBuilder): ISignalRBuilder {
    this._options = props;
    return this;
  }
  // public withFeature(props: SignalRFeatureArgs): ISignalRBuilder {
  //   this._features.push(props);
  //   return this;
  // }

  private buildSignalR() {
    let { group, dependsOn, ignoreChanges } = this.args;
    const isFreeTier = this._sku.name === 'Free_F1';
    if(!ignoreChanges) ignoreChanges = [];
    //Free tier does not support private link (!ignoreChanges) ignoreChanges = [];
    if(isFreeTier){
      ignoreChanges.push('networkACLs');
    }

    this._signalRInstance = new ss.SignalR(
      this._instanceName,
      {
        ...group,
        resourceName: this._instanceName,
        kind: this._kind,
        sku: this._sku,
        cors: { allowedOrigins: this._origins },
        features: [{ flag: 'ServiceMode', value: 'Default' }],
        disableAadAuth: this._options?.disableAadAuth,
        disableLocalAuth: this._options?.disableLocalAuth,
        publicNetworkAccess:
          this._options?.publicNetworkAccess === false ? 'Disabled' : 'Enabled',
        tls: { clientCertEnabled: this._options?.clientCertEnabled },
        identity: { type: ss.ManagedIdentityType.None },

        networkACLs: isFreeTier ? undefined : this._privateLink
          ? {
              defaultAction: ss.ACLAction.Allow,
              publicNetwork: {
                allow: [ss.SignalRRequestType.ClientConnection],
                deny: [
                  ss.SignalRRequestType.ServerConnection,
                  ss.SignalRRequestType.RESTAPI,
                ],
              },
              privateEndpoints: [
                {
                  name: naming.getPrivateEndpointName(this._instanceName),
                  allow: [
                    ss.SignalRRequestType.ClientConnection,
                    ss.SignalRRequestType.ServerConnection,
                  ],
                  deny: [ss.SignalRRequestType.RESTAPI],
                },
              ],
            }
          : {
              defaultAction: ss.ACLAction.Allow,
              publicNetwork: {
                allow: [
                  ss.SignalRRequestType.ClientConnection,
                  ss.SignalRRequestType.ServerConnection,
                ],
                deny: [ss.SignalRRequestType.RESTAPI],
              },
            },
      },
      { dependsOn, ignoreChanges },
    );
  }

  private buildPrivateLink() {
    if (!this._privateLink || this._sku.name === 'Free_F1') return;
    //The Private Zone will create in Dev and reuse for sandbox and prd.
    SignalRPrivateLink({
      ...this._privateLink,
      dependsOn: this._signalRInstance,
      resourceInfo: {
        name: this._instanceName,
        group: this.args.group,
        id: this._signalRInstance!.id,
      },
    });
  }

  private buildSecrets() {
    const { vaultInfo } = this.args;
    if (!vaultInfo) return;

    this._signalRInstance!.hostName.apply(async (h) => {
      if (!h) return;

      const keys = await ss.listSignalRKeys({
        resourceName: this._instanceName,
        resourceGroupName: this.args.group.resourceGroupName,
      });

      addCustomSecrets({
        vaultInfo,
        contentType: 'SignalR',
        dependsOn: this._signalRInstance,
        items: env.DPA_CONN_ENABLE_SECONDARY
          ? [
              { name: `${this._instanceName}-host`, value: h },
              {
                name: `${this._instanceName}-conn-primary`,
                value: keys.primaryConnectionString!,
              },
              {
                name: `${this._instanceName}-conn-secondary`,
                value: keys.secondaryConnectionString!,
              },
            ]
          : [
              { name: `${this._instanceName}-host`, value: h },
              {
                name: `${this._instanceName}-conn`,
                value: keys.primaryConnectionString!,
              },
            ],
      });
    });
  }

  public build(): ResourceInfo {
    this.buildSignalR();
    this.buildPrivateLink();
    this.buildSecrets();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._signalRInstance!.id,
    };
  }
}

export default (props: SignalRBuilderArgs) =>
  new SignalRBuilder(props) as ISignalRKindBuilder;
