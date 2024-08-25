import { Builder } from './types';
import { ResourceInfo } from '../types';
import * as search from '@pulumi/azure-native/search';
import {
  AzSearchBuilderArgs,
  AzSearchNetworkType,
  IAzSearchBuilder,
  IAzSearchSkuBuilder,
} from './types';
import { naming } from '../Common';
import { addCustomSecrets } from '../KeyVault/CustomHelper';
import { AzSearchPrivateLink } from '../VNet';

class AzSearchBuilder
  extends Builder<ResourceInfo>
  implements IAzSearchSkuBuilder, IAzSearchBuilder
{
  private readonly _instanceName: string;
  private _azSearch: search.Service | undefined = undefined;

  private _sku: search.SkuName = search.SkuName.Free;
  private _network: AzSearchNetworkType | undefined = undefined;

  constructor(private args: AzSearchBuilderArgs) {
    super(args);
    this._instanceName = naming.getSearchServiceName(args.name);
  }

  public withSku(sku: search.SkuName): IAzSearchBuilder {
    this._sku = sku;
    return this;
  }
  public withNetwork(props: AzSearchNetworkType): IAzSearchBuilder {
    this._network = props;
    return this;
  }

  private buildAzSearch() {
    const { group, enableEncryption, dependsOn, ignoreChanges } = this.args;

    this._azSearch = new search.Service(
      this._instanceName,
      {
        ...group,
        searchServiceName: this._instanceName,
        sku: { name: this._sku! },
        authOptions: {
          aadOrApiKey: {
            aadAuthFailureMode:
              search.AadAuthFailureMode.Http401WithBearerChallenge,
          },
        },
        hostingMode: 'default',
        encryptionWithCmk: enableEncryption
          ? {
              enforcement: search.SearchEncryptionWithCmk.Enabled,
            }
          : undefined,
        identity: {
          type:
            this._sku === search.SkuName.Free
              ? search.IdentityType.None
              : search.IdentityType.SystemAssigned,
        },

        disableLocalAuth: this._network?.disableLocalAuth,
        publicNetworkAccess: this._network?.privateLink
          ? 'disabled'
          : 'enabled',
        networkRuleSet: this._network?.ipAddresses
          ? {
              ipRules: this._network?.ipAddresses.map((i) => ({ value: i })),
            }
          : undefined,
      },
      { dependsOn, ignoreChanges },
    );
  }

  private buildNetwork() {
    if (!this._network?.privateLink) return;

    AzSearchPrivateLink({
      ...this._network.privateLink,
      dependsOn: this._azSearch,
      resourceInfo: {
        name: this._instanceName,
        group: this.args.group,
        id: this._azSearch!.id,
      },
    });
  }
  private buildSecrets() {
    const { vaultInfo } = this.args;
    if (this._network?.disableLocalAuth || !vaultInfo) return;

    this._azSearch!.id.apply(async (id) => {
      if (!id) return;

      const keys = await search.listQueryKeyBySearchService({
        searchServiceName: this._instanceName,
        resourceGroupName: this.args.group.resourceGroupName,
      });

      addCustomSecrets({
        vaultInfo,
        dependsOn: this._azSearch,
        contentType: `Az Search: ${this._instanceName}`,
        items: [
          { name: `${this._instanceName}-key`, value: keys.value[0].key },
        ],
      });
    });
  }

  public build(): ResourceInfo {
    this.buildAzSearch();
    this.buildNetwork();
    this.buildSecrets();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._azSearch!.id,
    };
  }
}

export default (args: AzSearchBuilderArgs) =>
  new AzSearchBuilder(args) as IAzSearchSkuBuilder;
