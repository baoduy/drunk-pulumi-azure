import {
  IServiceBusBuilder,
  IServiceBusSkuBuilder,
  ServiceBusBuilderArgs,
  ServiceBusOptions,
  ServiceBusQueueArgs,
  ServiceBusSkuTypes,
  ServiceBusSubArgs,
  ServiceBusTopicArgs,
  Builder,
} from './types';

import {
  NetworkPropsType,
  ResourceInfo,
  WithDependsOn,
  WithNamedType,
} from '../types';
import { getServiceBusName, isPrd } from '../Common';
import * as bus from '@pulumi/azure-native/servicebus/v20230101preview';
import { addEncryptKey } from '../KeyVault/Helper';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { addCustomSecrets } from '../KeyVault/CustomHelper';

const defaultQueueOptions: ServiceBusQueueArgs = {
  duplicateDetectionHistoryTimeWindow: 'P10M',
  //maxMessageSizeInKilobytes: 1024,
  //autoDeleteOnIdle: isPrd ? 'P180D' : 'P90D',
  maxDeliveryCount: 10,
  enableBatchedOperations: true,
  enablePartitioning: true,
  maxSizeInMegabytes: isPrd ? 10 * 1024 : 1024,
  //Default is 'PT1M' (1 minute) and max is 5 minutes.
  lockDuration: 'PT1M',
  defaultMessageTimeToLive: isPrd ? 'P30D' : 'P5D',
  deadLetteringOnMessageExpiration: true,
};

const defaultTopicOptions: ServiceBusTopicArgs = {
  duplicateDetectionHistoryTimeWindow: 'P10M',
  //maxMessageSizeInKilobytes: 1024,
  //autoDeleteOnIdle: isPrd ? 'P180D' : 'P90D',
  defaultMessageTimeToLive: isPrd ? 'P30D' : 'P5D',
  enablePartitioning: true,
  maxSizeInMegabytes: isPrd ? 10 * 1024 : 1024,
  enableBatchedOperations: true,
};

const defaultSubOptions: ServiceBusSubArgs = {
  duplicateDetectionHistoryTimeWindow: 'P10M',
  autoDeleteOnIdle: isPrd ? 'P180D' : 'P90D',
  defaultMessageTimeToLive: isPrd ? 'P30D' : 'P5D',
  enableBatchedOperations: true,
  deadLetteringOnMessageExpiration: true,
  lockDuration: 'PT1M',
  maxDeliveryCount: 10,
};

class ServiceBusBuilder
  extends Builder<ResourceInfo>
  implements IServiceBusBuilder, IServiceBusSkuBuilder
{
  private readonly _instanceName: string;
  private _sbInstance: bus.Namespace | undefined = undefined;
  private _networkInstance: bus.NamespaceNetworkRuleSet | undefined = undefined;

  private _sku: ServiceBusSkuTypes = 'Basic';
  private _network: NetworkPropsType | undefined = undefined;
  private _queues: Record<string, ServiceBusQueueArgs> = {};
  private _topics: Record<string, ServiceBusTopicArgs> = {};
  private _options: ServiceBusOptions = {};

  constructor(private args: ServiceBusBuilderArgs) {
    super(args);
    this._instanceName = getServiceBusName(args.name);
  }

  public withSku(sku: ServiceBusSkuTypes): IServiceBusBuilder {
    this._sku = sku;
    return this;
  }
  public withOptions(props: ServiceBusOptions): IServiceBusBuilder {
    this._options = props;
    return this;
  }
  public withNetwork(props: NetworkPropsType): IServiceBusBuilder {
    if (this._sku !== 'Premium')
      throw new Error(
        "The network only support for Service Bus with 'Premium' tier.",
      );

    this._network = props;
    return this;
  }
  public withNetworkIf(
    condition: boolean,
    props: NetworkPropsType,
  ): IServiceBusBuilder {
    if (condition) return this.withNetwork(props);
    return this;
  }
  public withQueues(
    props: Record<string, ServiceBusQueueArgs>,
  ): IServiceBusBuilder {
    this._queues = { ...this._queues, ...props };
    return this;
  }
  public withTopics(
    props: Record<string, ServiceBusTopicArgs>,
  ): IServiceBusBuilder {
    this._topics = { ...this._topics, ...props };
    return this;
  }
  private buildNamespace() {
    const {
      dependsOn,
      ignoreChanges = [],
      enableEncryption,
      vaultInfo,
      group,
      envUIDInfo,
    } = this.args;

    const encryptionKey = enableEncryption
      ? addEncryptKey(this._instanceName, vaultInfo!)
      : undefined;

    this._sbInstance = new bus.Namespace(
      this._instanceName,
      {
        ...group,
        ...this._options,
        namespaceName: this._instanceName,
        sku: { name: this._sku, tier: this._sku },
        minimumTlsVersion: '1.2',
        zoneRedundant: isPrd,

        identity: {
          type: this.args.envUIDInfo
            ? bus.ManagedServiceIdentityType.SystemAssigned_UserAssigned
            : bus.ManagedServiceIdentityType.SystemAssigned,
          //all uuid must assigned here before use
          userAssignedIdentities: this.args.envUIDInfo
            ? [this.args.envUIDInfo.id]
            : undefined,
        },

        encryption:
          encryptionKey && this._sku === 'Premium'
            ? {
                keySource: bus.KeySource.Microsoft_KeyVault,
                keyVaultProperties: [
                  {
                    ...encryptionKey,
                    identity: envUIDInfo
                      ? { userAssignedIdentity: envUIDInfo.id }
                      : undefined,
                  },
                ],
                requireInfrastructureEncryption: true,
              }
            : undefined,
        publicNetworkAccess: this._network?.privateLink
          ? 'Disabled'
          : 'Enabled',
      },
      {
        dependsOn,
        deleteBeforeReplace: true,
        ignoreChanges: [
          ...ignoreChanges,
          'requireInfrastructureEncryption',
          'encryption.requireInfrastructureEncryption',
        ],
      },
    );
  }

  private buildNetwork() {
    if (!this._network) return;
    const { ipAddresses = [], subnetId, privateLink } = this._network!;

    this._networkInstance = new bus.NamespaceNetworkRuleSet(
      this._instanceName,
      {
        ...this.args.group,
        namespaceName: this._sbInstance!.name,
        defaultAction: 'Allow',
        trustedServiceAccessEnabled: true,

        ipRules: ipAddresses.map((i) => ({
          ipMask: i,
          action: bus.NetworkRuleIPAction.Allow,
        })),
        virtualNetworkRules: subnetId
          ? [
              {
                ignoreMissingVnetServiceEndpoint: false,
                subnet: { id: subnetId },
              },
            ]
          : undefined,
      },
      { dependsOn: this._sbInstance },
    );

    if (privateLink) {
      PrivateEndpoint({
        ...privateLink,
        privateDnsZoneName: 'privatelink.servicebus.windows.net',
        resourceInfo: {
          name: this._instanceName,
          group: this.args.group,
          id: this._sbInstance!.id,
        },
        linkServiceGroupIds: privateLink.type
          ? [privateLink.type]
          : ['namespace'],
        dependsOn: this._sbInstance,
      });
    }
  }

  private buildQueues() {
    Object.keys(this._queues).map((queueName) => {
      const queueOps = this._queues[queueName];
      const queue = new bus.Queue(
        `${this._instanceName}-${queueName}`,
        {
          ...this.args.group,
          queueName,
          namespaceName: this._instanceName,
          ...defaultQueueOptions,
          ...queueOps,
        },
        { dependsOn: this._sbInstance },
      );

      ['both', 'send', 'listen'].map((type) =>
        this.buildConnectionString({
          type,
          level: 'topic',
          name: queueName,
          dependsOn: queue,
        }),
      );
    });
  }

  private buildTopics() {
    Object.keys(this._topics).map((topicName) => {
      const tpOps = this._topics[topicName];
      const topic = new bus.Topic(
        `${this._instanceName}-${topicName}`,
        {
          ...this.args.group,
          topicName,
          namespaceName: this._instanceName,
          ...defaultTopicOptions,
          ...tpOps,
        },
        { dependsOn: this._sbInstance },
      );

      ['both', 'send', 'listen'].map((type) =>
        this.buildConnectionString({
          type,
          level: 'topic',
          name: topicName,
          dependsOn: topic,
        }),
      );

      //Subscriptions
      if (tpOps.subscriptions) {
        Object.keys(tpOps.subscriptions).map((subscriptionName) => {
          const subOps = tpOps.subscriptions![subscriptionName];
          return new bus.Subscription(
            `${this._instanceName}-${topicName}-${subscriptionName}`,
            {
              ...this.args.group,
              subscriptionName: subscriptionName,
              topicName,
              namespaceName: this._instanceName,
              ...defaultSubOptions,
              ...subOps,
            },
            { dependsOn: topic },
          );
        });
      }
    });
  }

  private buildConnectionString({
    type,
    level,
    name,
    dependsOn,
  }: {
    type: 'send' | 'listen' | 'both' | string;
    level: 'queue' | 'topic' | string;
  } & WithDependsOn &
    WithNamedType) {
    if (this._options?.disableLocalAuth || !this.args.vaultInfo) return;
    const n = `${this._instanceName}-${name}-rule`;
    const authorizationRuleName = `${name}-rule`;

    const permissions =
      type == 'both'
        ? [bus.AccessRights.Send, bus.AccessRights.Listen]
        : type === 'send'
          ? [bus.AccessRights.Send]
          : [bus.AccessRights.Listen];

    const rule =
      level === 'topic'
        ? new bus.TopicAuthorizationRule(
            n,
            {
              ...this.args.group,
              authorizationRuleName,
              topicName: name,
              namespaceName: this._instanceName,
              rights: permissions,
            },
            { dependsOn },
          )
        : new bus.QueueAuthorizationRule(
            n,
            {
              ...this.args.group,
              authorizationRuleName,
              queueName: name,
              namespaceName: this._instanceName,
              rights: permissions,
            },
            { dependsOn },
          );

    rule.id.apply(async (id) => {
      if (!id) return;
      const keys = await (level === 'topic'
        ? bus.listTopicKeys({
            ...this.args.group,
            authorizationRuleName,
            namespaceName: this._instanceName,
            topicName: name,
          })
        : bus.listQueueKeys({
            ...this.args.group,
            authorizationRuleName,
            namespaceName: this._instanceName,
            queueName: name,
          }));

      return addCustomSecrets({
        vaultInfo: this.args.vaultInfo!,
        contentType: `ServiceBus ${level} ${this._instanceName}/${name}`,
        dependsOn: rule,
        items: [
          { name: `${n}-${type}-primary`, value: keys.primaryConnectionString },
          {
            name: `${n}-${type}-secondary`,
            value: keys.secondaryConnectionString,
          },
        ],
      });
    });
  }

  public build(): ResourceInfo {
    this.buildNamespace();
    this.buildNetwork();
    this.buildQueues();
    this.buildTopics();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._sbInstance!.id,
    };
  }
}

export default (props: ServiceBusBuilderArgs) =>
  new ServiceBusBuilder(props) as IServiceBusSkuBuilder;
