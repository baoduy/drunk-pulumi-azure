import {
  Builder,
  IRedisCacheBuilder,
  IRedisCacheSkuBuilder,
  RedisCacheBuilderArgs,
  RedisCacheSkuBuilder,
} from './types';
import { NetworkPropsType, ResourceInfo } from '../types';
import { isPrd, naming } from '../Common';
import * as cache from '@pulumi/azure-native/cache';
import * as pulumi from '@pulumi/pulumi';
import { convertToIpRange } from '../VNet/Helper';
import privateEndpointCreator from '../VNet/PrivateEndpoint';
import { addCustomSecrets } from '../KeyVault/CustomHelper';
import { ToWords } from 'to-words';
const toWord = new ToWords();

class RedisCacheBuilder
  extends Builder<ResourceInfo>
  implements IRedisCacheBuilder, IRedisCacheSkuBuilder
{
  private readonly _instanceName: string;
  private _sku: RedisCacheSkuBuilder = {
    name: 'Basic',
    family: 'C',
    capacity: 0,
  };
  private _network: NetworkPropsType | undefined = undefined;
  private _redisInstance: cache.Redis | undefined = undefined;

  constructor(private args: RedisCacheBuilderArgs) {
    super(args);
    this._instanceName = naming.getRedisCacheName(args.name);
  }

  public withSku(props: RedisCacheSkuBuilder): IRedisCacheBuilder {
    this._sku = props;
    return this;
  }
  public withNetwork(props: NetworkPropsType): IRedisCacheBuilder {
    this._network = props;
    return this;
  }

  private buildRedis() {
    const { group, dependsOn, ignoreChanges, importUri } = this.args;
    this._redisInstance = new cache.Redis(
      this._instanceName,
      {
        ...group,
        name: this._instanceName,
        minimumTlsVersion: '1.2',
        enableNonSslPort: false,
        identity: { type: cache.ManagedServiceIdentityType.SystemAssigned },
        sku: this._sku,
        zones:
          isPrd && this._sku.name === 'Premium' ? ['1', '2', '3'] : undefined,
        subnetId: this._network?.subnetId,
        publicNetworkAccess: this._network?.privateLink
          ? 'Disabled'
          : 'Enabled',
      },
      { dependsOn, import: importUri, ignoreChanges },
    );
  }
  private buildNetwork() {
    //Whitelist IpAddress
    if (this._network?.ipAddresses) {
      pulumi.output(this._network.ipAddresses).apply((ips) => {
        convertToIpRange(ips).map((range, i) => {
          const n = `allow_Ip_${toWord.convert(i)}`.toLowerCase();
          return new cache.FirewallRule(
            `${this._instanceName}-${n}`,
            {
              ...this.args.group,
              ruleName: n,
              cacheName: this._redisInstance!.name,
              startIP: range.start,
              endIP: range.end,
            },
            { dependsOn: this._redisInstance },
          );
        });
      });
    }

    //Private Link
    if (this._network?.privateLink) {
      privateEndpointCreator({
        ...this._network.privateLink,
        resourceInfo: {
          name: this._instanceName,
          group: this.args.group,
          id: this._redisInstance!.id,
        },
        privateDnsZoneName: 'privatelink.redis.cache.windows.net',
        linkServiceGroupIds: this._network.privateLink.type
          ? [this._network.privateLink.type]
          : ['redisCache'],
        dependsOn: this._redisInstance,
      });
    }
  }
  private buildSecrets() {
    const { vaultInfo } = this.args;
    if (!vaultInfo) return;

    this._redisInstance!.hostName.apply(async (h) => {
      if (!h) return;

      const keys = await cache.listRedisKeys({
        name: this._instanceName,
        resourceGroupName: this.args.group.resourceGroupName,
      });

      addCustomSecrets({
        vaultInfo,
        contentType: 'Redis Cache',
        dependsOn: this._redisInstance,
        items: [
          { name: `${this._instanceName}-host`, value: h },
          {
            name: `${this._instanceName}-primary-conn`,
            value: `${h}:6380,password=${keys.primaryKey},ssl=True,abortConnect=False`,
          },
          {
            name: `${this._instanceName}-secondary-conn`,
            value: `${h}:6380,password=${keys.secondaryKey},ssl=True,abortConnect=False`,
          },
        ],
      });
    });
  }

  public build(): ResourceInfo {
    this.buildRedis();
    this.buildNetwork();
    this.buildSecrets();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._redisInstance!.id,
    };
  }
}

export default (props: RedisCacheBuilderArgs) =>
  new RedisCacheBuilder(props) as IRedisCacheSkuBuilder;
