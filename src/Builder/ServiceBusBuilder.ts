import * as bus from '@pulumi/azure-native/servicebus';
import { isPrd, naming } from '../Common';
import env from '../env';
import { addCustomSecret, addCustomSecrets } from '../KeyVault/CustomHelper';
import { addEncryptKey } from '../KeyVault/Helper';
import {
  NetworkPropsType,
  ResourceInfo,
  WithDependsOn,
  WithNamedType,
} from '../types';
import { ServiceBusPrivateLink } from '../VNet';
import * as types from './types';

const defaultQueueOptions: types.ServiceBusQueueArgs = {
  //duplicateDetectionHistoryTimeWindow: 'P10M',
  //maxMessageSizeInKilobytes: 1024,
  //autoDeleteOnIdle: isPrd ? 'P180D' : 'P90D',
  maxDeliveryCount: 10,
  enableBatchedOperations: true,
  enablePartitioning: true,
  maxSizeInMegabytes: isPrd ? 10 * 1024 : 1024,
  //Default is 'PT1M' (1 minute) and max is 5 minutes.
  lockDuration: 'PT1M',
  defaultMessageTimeToLive: isPrd ? 'P90D' : 'P5D',
  deadLetteringOnMessageExpiration: true,
};

const defaultTopicOptions: types.ServiceBusTopicArgs = {
  //duplicateDetectionHistoryTimeWindow: 'P10M',
  //maxMessageSizeInKilobytes: 1024,
  //autoDeleteOnIdle: isPrd ? 'P180D' : 'P90D',
  defaultMessageTimeToLive: isPrd ? 'P30D' : 'P5D',
  enablePartitioning: true,
  maxSizeInMegabytes: isPrd ? 10 * 1024 : 1024,
  enableBatchedOperations: true,
};

const defaultSubOptions: types.ServiceBusSubArgs = {
  duplicateDetectionHistoryTimeWindow: 'P10M',
  //autoDeleteOnIdle: isPrd ? 'P180D' : 'P90D',
  defaultMessageTimeToLive: isPrd ? 'P90D' : 'P5D',
  enableBatchedOperations: true,
  deadLetteringOnMessageExpiration: true,
  lockDuration: 'PT1M',
  maxDeliveryCount: 10,
};

/**
 * ServiceBusBuilder class for creating and configuring Azure Service Bus resources.
 * This class implements the Builder pattern for Service Bus configuration including
 * namespaces, queues, topics, and subscriptions.
 * @extends Builder<ResourceInfo>
 * @implements IServiceBusBuilder
 * @implements IServiceBusSkuBuilder
 */
class ServiceBusBuilder
  extends types.Builder<ResourceInfo>
  implements types.IServiceBusBuilder, types.IServiceBusSkuBuilder
{
  private readonly _instanceName: string;
  
  // Resource instances
  private _sbInstance: bus.Namespace | undefined = undefined;
  private _networkInstance: bus.NamespaceNetworkRuleSet | undefined = undefined;

  // Configuration properties
  private _sku: types.ServiceBusSkuTypes = 'Basic';
  private _network: NetworkPropsType | undefined = undefined;
  private _queues: Record<string, types.ServiceBusQueueArgs> = {};
  private _topics: Record<string, types.ServiceBusTopicArgs> = {};
  private _options: types.ServiceBusOptions = {};

  /**
   * Creates an instance of ServiceBusBuilder.
   * @param {types.ServiceBusBuilderArgs} args - The arguments for building the Service Bus.
   */
  constructor(private args: types.ServiceBusBuilderArgs) {
    super(args);
    this._instanceName = naming.getServiceBusName(args.name);
  }

  /**
   * Sets the SKU for the Service Bus namespace.
   * @param {types.ServiceBusSkuTypes} sku - The SKU to set (Basic, Standard, or Premium).
   * @returns {types.IServiceBusBuilder} The current ServiceBusBuilder instance.
   */
  public withSku(sku: types.ServiceBusSkuTypes): types.IServiceBusBuilder {
    this._sku = sku;
    return this;
  }

  /**
   * Sets additional options for the Service Bus namespace.
   * @param {types.ServiceBusOptions} props - The options to set for the Service Bus.
   * @returns {types.IServiceBusBuilder} The current ServiceBusBuilder instance.
   */
  public withOptions(props: types.ServiceBusOptions): types.IServiceBusBuilder {
    this._options = props;
    return this;
  }

  /**
   * Sets network configuration for the Service Bus namespace.
   * Note: Network configuration is only supported for Premium tier.
   * @param {NetworkPropsType} props - The network properties to set.
   * @returns {types.IServiceBusBuilder} The current ServiceBusBuilder instance.
   * @throws {Error} When network is configured for non-Premium tier.
   */
  public withNetwork(props: NetworkPropsType): types.IServiceBusBuilder {
    if (this._sku !== 'Premium')
      throw new Error(
        "The network only support for Service Bus with 'Premium' tier."
      );

    this._network = props;
    return this;
  }

  /**
   * Conditionally sets network configuration for the Service Bus namespace.
   * @param {boolean} condition - Whether to apply the network configuration.
   * @param {NetworkPropsType} props - The network properties to set.
   * @returns {types.IServiceBusBuilder} The current ServiceBusBuilder instance.
   */
  public withNetworkIf(
    condition: boolean,
    props: NetworkPropsType
  ): types.IServiceBusBuilder {
    if (condition) return this.withNetwork(props);
    return this;
  }

  /**
   * Adds queues to the Service Bus namespace.
   * @param {Record<string, types.ServiceBusQueueArgs>} props - A record of queue names and their configurations.
   * @returns {types.IServiceBusBuilder} The current ServiceBusBuilder instance.
   */
  public withQueues(
    props: Record<string, types.ServiceBusQueueArgs>
  ): types.IServiceBusBuilder {
    this._queues = { ...this._queues, ...props };
    return this;
  }

  /**
   * Adds topics to the Service Bus namespace.
   * @param {Record<string, types.ServiceBusTopicArgs>} props - A record of topic names and their configurations.
   * @returns {types.IServiceBusBuilder} The current ServiceBusBuilder instance.
   */
  public withTopics(
    props: Record<string, types.ServiceBusTopicArgs>
  ): types.IServiceBusBuilder {
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
          //all uuid must assign here before use
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
      }
    );

    ['manage', 'listen'].map((type) =>
      this.buildConnectionString({
        type,
        level: 'namespace',
        name: this._instanceName,
        dependsOn: this._sbInstance,
      })
    );

    //Add ServiceBus endpoint to vault
    if (vaultInfo) {
      addCustomSecret({
        name: `${this._instanceName}-endpoint`,
        dependsOn: this._sbInstance,
        contentType: `Service Bus ${this._instanceName}`,
        value: this._sbInstance!.serviceBusEndpoint.apply(
          (e) => new URL(e).hostname
        ),
        vaultInfo,
      });
    }
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
      { dependsOn: this._sbInstance }
    );

    if (privateLink) {
      ServiceBusPrivateLink({
        ...privateLink,
        dependsOn: this._sbInstance,
        resourceInfo: {
          name: this._instanceName,
          group: this.args.group,
          id: this._sbInstance!.id,
        },
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
        { dependsOn: this._sbInstance, ignoreChanges: ['enablePartitioning'] }
      );

      ['send', 'listen'].map((type) =>
        this.buildConnectionString({
          type,
          level: 'queue',
          name: queueName,
          dependsOn: queue,
        })
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
        { dependsOn: this._sbInstance }
      );

      ['manage', 'send', 'listen'].map((type) =>
        this.buildConnectionString({
          type,
          level: 'topic',
          name: topicName,
          dependsOn: topic,
        })
      );

      //Subscriptions
      this.buildSubscriptions({
        name: topicName,
        topic,
        subs: tpOps.subscriptions,
      });

      return topic;
    });
  }

  private buildSubscriptions({
    name,
    topic,
    subs,
  }: {
    topic: bus.Topic;
    subs?: Record<string, types.ServiceBusSubArgs>;
  } & WithNamedType) {
    if (!subs) return;

    Object.keys(subs).map((subscriptionName) => {
      const subOps = subs[subscriptionName];
      const sub = new bus.Subscription(
        `${this._instanceName}-${name}-${subscriptionName}`,
        {
          ...this.args.group,
          subscriptionName: subscriptionName,
          namespaceName: this._instanceName,
          topicName: name,
          ...defaultSubOptions,
          ...subOps,
        },
        { dependsOn: topic }
      );

      if (subOps.rules) {
        new bus.Rule(
          `${this._instanceName}-${name}-${subscriptionName}-rule`,
          {
            ...this.args.group,
            namespaceName: this._instanceName,
            topicName: name,
            subscriptionName,
            ...subOps.rules,
          },
          { dependsOn: sub }
        );
      }
      return sub;
    });
  }

  private buildConnectionString({
    type,
    level,
    name,
    dependsOn,
  }: {
    type: 'send' | 'listen' | 'both' | 'manage' | string;
    level: 'queue' | 'topic' | 'namespace' | string;
  } & WithDependsOn &
    WithNamedType) {
    if (this._options?.disableLocalAuth || !this.args.vaultInfo) return;
    const authorizationRuleName =
      level === 'namespace' ? `${name}-${type}` : `${level}-${name}-${type}`;
    const n =
      level === 'namespace'
        ? authorizationRuleName
        : `${this._instanceName}-${authorizationRuleName}`;

    const rights =
      type === 'manage'
        ? [
            bus.AccessRights.Manage,
            bus.AccessRights.Send,
            bus.AccessRights.Listen,
          ]
        : type == 'both'
        ? [bus.AccessRights.Send, bus.AccessRights.Listen]
        : type === 'send'
        ? [bus.AccessRights.Send]
        : [bus.AccessRights.Listen];

    const rule =
      level === 'namespace'
        ? new bus.NamespaceAuthorizationRule(
            n,
            {
              ...this.args.group,
              authorizationRuleName,
              namespaceName: this._instanceName,
              rights,
            },
            { dependsOn }
          )
        : level === 'topic'
        ? new bus.TopicAuthorizationRule(
            n,
            {
              ...this.args.group,
              authorizationRuleName,
              namespaceName: this._instanceName,
              rights,
              topicName: name,
            },
            { dependsOn }
          )
        : new bus.QueueAuthorizationRule(
            n,
            {
              ...this.args.group,
              authorizationRuleName,
              namespaceName: this._instanceName,
              rights,
              queueName: name,
            },
            { dependsOn }
          );

    rule.id.apply(async (id) => {
      if (!id) return;
      const keys = await (level === 'namespace'
        ? bus.listNamespaceKeys({
            ...this.args.group,
            authorizationRuleName,
            namespaceName: this._instanceName,
          })
        : level === 'topic'
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
        contentType: `ServiceBus ${n}`,
        dependsOn: rule,
        items: env.DPA_CONN_ENABLE_SECONDARY
          ? [
              { name: `${n}-primary`, value: keys.primaryConnectionString },
              {
                name: `${n}-secondary`,
                value: keys.secondaryConnectionString,
              },
            ]
          : [{ name: n, value: keys.primaryConnectionString }],
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

export default (props: types.ServiceBusBuilderArgs) =>
  new ServiceBusBuilder(props) as types.IServiceBusSkuBuilder;
