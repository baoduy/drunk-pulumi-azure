import * as bus from '@pulumi/azure-native/servicebus';
import * as pulumi from '@pulumi/pulumi';

import {
  BasicArgs,
  BasicMonitorArgs,
  BasicResourceArgs,
  BasicResourceResultProps,
  DefaultResourceArgs,
  KeyVaultInfo,
  PrivateLinkProps,
  ResourceGroupInfo,
} from '../types';
import {
  BusConnectionTypes,
  getNamespaceVaultName,
  getQueueName,
  getSubscriptionName,
  getTopicName,
  getTopicOrQueueVaultName,
} from './ServiceBusHelper';
import { defaultTags, isPrd } from '../Common/AzureEnv';
import creator from '../Core/ResourceCreator';
import { getPrivateEndpointName, getServiceBusName } from '../Common/Naming';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import Locker from '../Core/Locker';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { getSecret } from '../KeyVault/Helper';

type TransportTypes = 'AmqpWebSockets' | 'Amqp' | null;
const duplicateDetectedTime = isPrd ? 'P3D' : 'PT10M';

const defaultValues = {
  maxDeliveryCount: 10,
  enableBatchedOperations: true,
  defaultMessageTtl: isPrd ? 'P30D' : 'P1D',
  defaultMessageTimeToLive: isPrd ? 'P30D' : 'P1D',
  deadLetteringOnMessageExpiration: true,
  maxSizeInMegabytes: 1024,
  lockDuration: 'PT1M',

  //Auto delete subscription after 30 idle.
  //autoDeleteOnIdle: 'P30D',
  //enableExpress: true, this and requiresDuplicateDetection are not able to enabled together
};

type OptionsType = {
  requiresDuplicateDetection?: pulumi.Input<boolean>;
  duplicateDetectionHistoryTimeWindow?: pulumi.Input<string>;
  requiresSession?: pulumi.Input<boolean>;
  enablePartitioning?: pulumi.Input<boolean>;
  autoDeleteOnIdle?: pulumi.Input<string>;
};

interface ConnCreatorProps extends BasicArgs {
  topicName?: string;
  queueName?: string;
  namespaceName: string;
  resourceGroupName: string;
  connectionType: BusConnectionTypes;
  transportType?: TransportTypes;
  removeEntityPath?: boolean;
  vaultInfo: KeyVaultInfo;
}
const createAndStoreConnection = ({
  namespaceName,
  topicName,
  queueName,
  connectionType,
  transportType = 'AmqpWebSockets',
  resourceGroupName,
  removeEntityPath,
  vaultInfo,
  dependsOn,
}: ConnCreatorProps) => {
  const name = (topicName || queueName)!;
  const key = name
    ? getTopicOrQueueVaultName({
        fullName: name,
        namespaceFullName: namespaceName,
        connectionType,
      })
    : getNamespaceVaultName({
        namespaceFullName: namespaceName,
        connectionType,
      });

  const primaryName = `${key}-primary`;
  const secondaryName = `${key}-secondary`;

  const rights =
    connectionType == BusConnectionTypes.Manage
      ? [
          bus.AccessRights.Send,
          bus.AccessRights.Listen,
          bus.AccessRights.Manage,
        ]
      : connectionType == BusConnectionTypes.Send
      ? [bus.AccessRights.Send]
      : [bus.AccessRights.Listen];

  const rule = topicName
    ? new bus.TopicAuthorizationRule(
        key,
        {
          authorizationRuleName: key,
          topicName,
          namespaceName,
          resourceGroupName,

          rights,
        },
        { dependsOn }
      )
    : queueName
    ? new bus.QueueAuthorizationRule(
        key,
        {
          authorizationRuleName: key,
          queueName,
          namespaceName,
          resourceGroupName,

          rights,
        },
        { dependsOn }
      )
    : new bus.NamespaceAuthorizationRule(
        key,
        {
          authorizationRuleName: key,
          namespaceName,
          resourceGroupName,

          rights,
        },
        { dependsOn }
      );

  rule.id.apply(async (id) => {
    if (!id) return;

    const keys = await (topicName
      ? bus.listTopicKeys({
          authorizationRuleName: key,
          namespaceName,
          resourceGroupName,
          topicName,
        })
      : queueName
      ? bus.listQueueKeys({
          authorizationRuleName: key,
          namespaceName,
          resourceGroupName,
          queueName,
        })
      : bus.listNamespaceKeys({
          authorizationRuleName: key,
          namespaceName,
          resourceGroupName,
        }));

    let primaryConn = removeEntityPath
      ? keys.primaryConnectionString.replace(`;EntityPath=${name}`, '')
      : keys.primaryConnectionString;

    if (typeof transportType === 'string')
      primaryConn += `;TransportType=${transportType};`;

    addCustomSecret({
      name: primaryName,
      value: primaryConn,
      vaultInfo,
      contentType: `ServiceBus ${namespaceName}/${name}`,
      dependsOn: rule,
    });

    let secondConn = removeEntityPath
      ? keys.secondaryConnectionString.replace(`;EntityPath=${name}`, '')
      : keys.secondaryConnectionString;

    if (typeof transportType === 'string')
      secondConn += `;TransportType=${transportType};`;

    addCustomSecret({
      name: secondaryName,
      value: secondConn,
      vaultInfo,
      contentType: `ServiceBus ${namespaceName}/${name}`,
      dependsOn: rule,
    });
  });

  return { primaryName, secondaryName };
};

interface TopicProps
  extends Pick<ConnCreatorProps, 'removeEntityPath' | 'transportType'>,
    BasicArgs {
  shortName: string;
  namespaceFullName: string;
  version: number;
  vaultInfo?: KeyVaultInfo;
  group: ResourceGroupInfo;
  //The short name of subscription ex 'sub1' the full name is 'sub1-topic1' the name of topic will be added as suffix.
  subscriptions?: Array<{ shortName: string; enableSession?: boolean }>;
  enableConnections?: boolean;

  options?: OptionsType & { supportOrdering?: boolean };
  lock?: boolean;
}

/** Topic creator */
const topicCreator = ({
  group,
  namespaceFullName,
  subscriptions,
  shortName,
  vaultInfo,
  version,
  enableConnections,
  lock = true,
  dependsOn,
  options = {
    duplicateDetectionHistoryTimeWindow: duplicateDetectedTime,
    requiresDuplicateDetection: true,
    enablePartitioning: true,
  },
  ...others
}: TopicProps) => {
  const topicName = getTopicName(shortName, version);

  const topic = new bus.Topic(
    topicName,
    {
      topicName,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,

      ...defaultValues,
      ...options,
    },
    { dependsOn }
  );

  if (lock) {
    Locker({ name: topicName, resourceId: topic.id, dependsOn: topic });
  }

  let primaryConnectionKeys:
    | { secondaryName: string; primaryName: string }
    | undefined = undefined;
  let secondaryConnectionKeys:
    | { secondaryName: string; primaryName: string }
    | undefined = undefined;
  if (vaultInfo && enableConnections) {
    //Send Key
    primaryConnectionKeys = createAndStoreConnection({
      topicName,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Send,
      dependsOn: topic,
      ...others,
    });

    //Listen Key
    secondaryConnectionKeys = createAndStoreConnection({
      topicName,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Listen,
      dependsOn: topic,
      ...others,
    });

    //Manage Key
    // createAndStoreConnection({
    //   topicName,
    //   namespaceName: namespaceFullName,
    //   resourceGroupName: group.resourceGroupName,
    //   vaultInfo,
    //   connectionType: BusConnectionTypes.Manage,
    //   dependsOn: topic,
    //   ...others,
    // });
  }

  let subs: Array<BasicResourceResultProps<bus.Subscription>> | undefined =
    undefined;

  //Create Subscriptions
  if (subscriptions) {
    subs = subscriptions.map((s) =>
      subscriptionCreator({
        shortName: s.enableSession
          ? `${s.shortName}-${shortName.toLocaleLowerCase()}v${version}-session`
          : `${s.shortName}-${shortName.toLocaleLowerCase()}v${version}`,
        namespaceFullName,
        topicFullName: topic.name,
        enableSession: s.enableSession,
        group,
        lock: false,
        dependsOn: topic,
      })
    );
  }

  return {
    name: topicName,
    topic,
    subs,
    vaultNames: { primaryConnectionKeys, secondaryConnectionKeys },
  };
};

interface SubProps extends BasicArgs {
  shortName: string;
  namespaceFullName: pulumi.Input<string>;
  topicFullName: pulumi.Input<string>;
  group: ResourceGroupInfo;
  enableSession?: boolean;
  lock?: boolean;
}

/** Subscription creator */
const subscriptionCreator = ({
  group,
  shortName,
  topicFullName,
  namespaceFullName,
  enableSession,
  lock = true,
  dependsOn,
}: SubProps) => {
  const name = getSubscriptionName(shortName);

  const resource = new bus.Subscription(
    name,
    {
      subscriptionName: name,
      resourceGroupName: group.resourceGroupName,
      topicName: topicFullName,
      namespaceName: namespaceFullName,
      requiresSession: enableSession,

      ...defaultValues,
    },
    { dependsOn }
  );

  if (lock) {
    Locker({ name, resourceId: resource.id, dependsOn: resource });
  }

  return {
    name,
    resource,
  };
};

interface QueueProps
  extends Pick<ConnCreatorProps, 'removeEntityPath' | 'transportType'>,
    BasicArgs {
  shortName: string;
  version: number;
  namespaceFullName: string;
  vaultInfo?: KeyVaultInfo;
  group: ResourceGroupInfo;
  lock?: boolean;
  enableConnections?: boolean;
  options?: OptionsType;
}

interface TopicResultProps {
  name: string;
  topic: bus.Topic;
  subs?: Array<BasicResourceResultProps<bus.Subscription>>;
}

interface QueueResultProps {
  name: string;
  queue: bus.Queue;
}

/** Queue creator */
const queueCreator = ({
  group,
  namespaceFullName,
  shortName,
  vaultInfo,
  version,
  lock = true,
  enableConnections,
  options = {
    requiresDuplicateDetection: false,
    enablePartitioning: true,
  },
  dependsOn,
  ...others
}: QueueProps) => {
  const name = getQueueName(shortName, version);

  const queue = new bus.Queue(
    name,
    {
      queueName: name,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,

      ...defaultValues,
      ...options,
    },
    { dependsOn }
  );

  if (lock) {
    Locker({ name, resourceId: queue.id, dependsOn: queue });
  }

  let primaryConnectionKeys:
    | { secondaryName: string; primaryName: string }
    | undefined = undefined;
  let secondaryConnectionKeys:
    | { secondaryName: string; primaryName: string }
    | undefined = undefined;

  if (vaultInfo && enableConnections) {
    //Send Key
    primaryConnectionKeys = createAndStoreConnection({
      queueName: name,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Send,
      dependsOn: queue,
      ...others,
    });

    //Listen Key
    secondaryConnectionKeys = createAndStoreConnection({
      queueName: name,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Listen,
      dependsOn: queue,
      ...others,
    });

    //Manage Key
    // createAndStoreConnection({
    //   queueName: name,
    //   namespaceName: namespaceFullName,
    //   resourceGroupName: group.resourceGroupName,
    //   vaultInfo,
    //   connectionType: BusConnectionTypes.Manage,
    //   dependsOn: queue,
    //   ...others,
    // });
  }

  return {
    name,
    queue,
    vaultNames: { primaryConnectionKeys, secondaryConnectionKeys },
  };
};

interface Props
  extends BasicResourceArgs,
    Pick<ConnCreatorProps, 'removeEntityPath' | 'transportType'> {
  topics?: Array<
    Omit<TopicProps, 'group' | 'namespaceFullName' | 'vaultInfo' | 'dependsOn'>
  >;
  queues?: Array<
    Omit<QueueProps, 'group' | 'namespaceFullName' | 'vaultInfo' | 'dependsOn'>
  >;
  drConfig?: {
    alias?: pulumi.Input<string>;
    alternateName: pulumi.Input<string>;
    partnerNamespace: pulumi.Input<string>;
  };
  network?: {
    whitelistIps?: Array<pulumi.Input<string>>;
    enablePrivateLink?: boolean;
  } & Partial<PrivateLinkProps>;
  monitoring?: BasicMonitorArgs;
  sku?: bus.SkuName;
  vaultInfo: KeyVaultInfo;
  enableNamespaceConnections?: boolean;
  enableTopicConnections?: boolean;
  enableQueueConnections?: boolean;
  lock?: boolean;
}

/** Azure Bus creator */
export default async ({
  name,
  group,
  topics,
  queues,
  drConfig,
  network = {},
  vaultInfo,
  enableNamespaceConnections,
  enableTopicConnections,
  enableQueueConnections,
  sku = bus.SkuName.Basic,
  monitoring,
  ...others
}: Props) => {
  name = getServiceBusName(name);

  const { resource, locker, diagnostic } = await creator(bus.Namespace, {
    namespaceName: name,
    ...group,
    sku: { name: sku, tier: sku },

    tags: defaultTags,
    ...others,

    monitoring: monitoring
      ? {
          ...monitoring,
          logsCategories: ['OperationalLogs'],
        }
      : undefined,
  } as bus.NamespaceArgs & DefaultResourceArgs);

  const namespace = resource as bus.Namespace;

  if (drConfig && sku === bus.SkuName.Premium) {
    new bus.DisasterRecoveryConfig(name, {
      namespaceName: namespace.name,
      resourceGroupName: group.resourceGroupName,
      ...drConfig,
    });
  }

  let primaryConnectionKeys:
    | { secondaryName: string; primaryName: string }
    | undefined = undefined;
  let secondaryConnectionKeys:
    | { secondaryName: string; primaryName: string }
    | undefined = undefined;
  //Create Keys
  if (vaultInfo && enableNamespaceConnections) {
    //Send Key
    // createAndStoreConnection({
    //   namespaceName: name,
    //   resourceGroupName: group.resourceGroupName,
    //   vaultInfo,
    //   connectionType: BusConnectionTypes.Send,
    //   dependsOn: resource,
    //   ...others,
    // });

    //Listen Key
    primaryConnectionKeys = createAndStoreConnection({
      namespaceName: name,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Listen,
      dependsOn: resource,
      ...others,
    });

    //Manage Key
    secondaryConnectionKeys = createAndStoreConnection({
      namespaceName: name,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Manage,
      dependsOn: resource,
      ...others,
    });
  }

  //Create Topics and Queues
  let tps: Array<TopicResultProps> | undefined = undefined;
  if (topics) {
    tps = topics.map((t) =>
      topicCreator({
        group,
        namespaceFullName: name,
        vaultInfo,

        dependsOn: resource,
        enableConnections: enableTopicConnections,
        ...others,
        ...t,
      })
    );
  }

  let qes: Array<QueueResultProps> | undefined = undefined;
  if (queues) {
    qes = queues.map((q) =>
      queueCreator({
        group,
        namespaceFullName: name,
        vaultInfo,

        dependsOn: resource,
        enableConnections: enableQueueConnections,
        ...others,
        ...q,
      })
    );
  }

  if (network && sku === bus.SkuName.Premium) {
    if (
      !network.enablePrivateLink &&
      (network.subnetId || network.whitelistIps)
    ) {
      new bus.NamespaceNetworkRuleSet(name, {
        namespaceName: namespace.name,
        ...group,
        defaultAction: 'Deny',

        ipRules: network.whitelistIps
          ? network.whitelistIps.map((i) => ({
              ipMask: i,
              action: bus.NetworkRuleIPAction.Allow,
            }))
          : undefined,

        virtualNetworkRules: network.subnetId
          ? [
              {
                ignoreMissingVnetServiceEndpoint: false,
                subnet: { id: network.subnetId },
              },
            ]
          : undefined,
      });
    } else if (network.enablePrivateLink && network.subnetId) {
      PrivateEndpoint({
        name: getPrivateEndpointName(name),
        group,
        subnetId: network.subnetId,
        useGlobalDnsZone: network.useGlobalDnsZone,
        resourceId: namespace.id,
        linkServiceGroupIds: ['namespace'],
        privateDnsZoneName: 'privatelink.servicebus.windows.net',
      });
    }
  }

  return {
    name,
    resource: namespace,
    queues: qes,
    topics: tps,
    vaultNames: { primaryConnectionKeys, secondaryConnectionKeys },
    getConnectionString: (name: string) =>
      getSecret({ name, nameFormatted: true, vaultInfo }),
    locker,
    diagnostic,
  };
};
