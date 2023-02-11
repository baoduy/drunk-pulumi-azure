import * as bus from "@pulumi/azure-native/servicebus";
import * as pulumi from "@pulumi/pulumi";
import { Input } from "@pulumi/pulumi";

import {
  BasicMonitorArgs,
  BasicResourceArgs,
  BasicResourceResultProps,
  DefaultResourceArgs,
  KeyVaultInfo,
  PrivateLinkProps,
  ResourceGroupInfo,
  ResourceResultProps,
} from "../types";
import {
  BusConnectionTypes,
  getNamespaceVaultName,
  getQueueName,
  getSubscriptionName,
  getTopicName,
  getTopicOrQueueVaultName,
} from "./ServiceBusHelper";
import { defaultTags, isPrd } from "../Common/AzureEnv";
import creator from "../Core/ResourceCreator";
import { getPrivateEndpointName, getServiceBusName } from "../Common/Naming";
import PrivateEndpoint from "../VNet/PrivateEndpoint";
import Locker from "../Core/Locker";
import { addCustomSecret } from "../KeyVault/CustomHelper";

type TransportTypes = "AmqpWebSockets" | "Amqp";
const duplicateDetectedTime = isPrd ? "P3D" : "PT10M";

const defaultValues = {
  maxDeliveryCount: 10,
  enableBatchedOperations: true,
  defaultMessageTtl: isPrd ? "P30D" : "P1D",
  deadLetteringOnMessageExpiration: true,
  //Auto delete subscription after 30 idle.
  autoDeleteOnIdle: "P30D",
  lockDuration: "PT2M",
  //enableExpress: true, this and requiresDuplicateDetection are not able to enabled together
};

interface ConnCreatorProps {
  topicName?: string;
  queueName?: string;
  namespaceName: string;
  resourceGroupName: string;
  connectionType: BusConnectionTypes;
  transportType?: TransportTypes;
  removeEntityPath?: boolean;
  vaultInfo: KeyVaultInfo;
  dependsOn?:
    | pulumi.Input<pulumi.Resource>
    | pulumi.Input<pulumi.Input<pulumi.Resource>[]>;
}
const createAndStoreConnection = async ({
  namespaceName,
  topicName,
  queueName,
  connectionType,
  transportType = "AmqpWebSockets",
  resourceGroupName,
  removeEntityPath,
  vaultInfo,
  dependsOn,
}: ConnCreatorProps) => {
  const name = topicName || queueName;
  const key = name
    ? getTopicOrQueueVaultName({
        fullName: topicName || queueName || "",
        namespaceFullName: namespaceName,
        connectionType,
      })
    : getNamespaceVaultName({
        namespaceFullName: namespaceName,
        connectionType,
      });

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

    addCustomSecret({
      name: `${key}-primary`,
      value:
        (removeEntityPath
          ? keys.primaryConnectionString.replace(`;EntityPath=${name}`, "")
          : keys.primaryConnectionString) + `;TransportType=${transportType};`,
      vaultInfo,
      contentType: `ServiceBus ${namespaceName}/${topicName || queueName}`,
      dependsOn: rule,
    });

    addCustomSecret({
      name: `${key}-secondary`,
      value:
        (removeEntityPath
          ? keys.secondaryConnectionString.replace(`;EntityPath=${name}`, "")
          : keys.primaryConnectionString) + `;TransportType=${transportType};`,
      vaultInfo,
      contentType: `ServiceBus ${namespaceName}/${topicName || queueName}`,
      dependsOn: rule,
    });
  });

  return rule;
};

interface TopicProps
  extends Pick<ConnCreatorProps, "removeEntityPath" | "transportType"> {
  shortName: string;
  namespaceFullName: string;
  version: number;
  vaultInfo?: KeyVaultInfo;
  group: ResourceGroupInfo;
  //The short name of subscription ex 'sub1' the full name is 'sub1-topic1' the name of topic will be added as suffix.
  subscriptions?: Array<{ shortName: string; enableSession?: boolean }>;
  lock?: boolean;
  dependsOn?:
    | pulumi.Input<pulumi.Resource>
    | pulumi.Input<pulumi.Input<pulumi.Resource>[]>;
}

interface TopicResultProps {
  name: string;
  topic: bus.Topic;
  subs?: Array<BasicResourceResultProps<bus.Subscription>>;
}

/** Topic creator */
const topicCreator = async ({
  group,
  namespaceFullName,
  subscriptions,
  shortName,
  vaultInfo,
  version,
  lock = true,
  dependsOn,
  ...others
}: TopicProps): Promise<TopicResultProps> => {
  const topicName = getTopicName(shortName, version);

  const topic = new bus.Topic(
    topicName,
    {
      topicName,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      enablePartitioning: true,
      duplicateDetectionHistoryTimeWindow: duplicateDetectedTime,
      requiresDuplicateDetection: true,

      //enableExpress: true, this and requiresDuplicateDetection are not able to enabled together
      supportOrdering: true,
      maxSizeInMegabytes: isPrd ? 10240 : 1024,
    },
    { dependsOn }
  );

  if (lock) {
    Locker({ name: topicName, resourceId: topic.id, dependsOn: topic });
  }

  if (vaultInfo) {
    //Send Key
    await createAndStoreConnection({
      topicName,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Send,
      dependsOn: topic,
      ...others,
    });

    //Listen Key
    await createAndStoreConnection({
      topicName,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Listen,
      dependsOn: topic,
      ...others,
    });

    //Manage Key
    await createAndStoreConnection({
      topicName,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Manage,
      dependsOn: topic,
      ...others,
    });
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

  return { name: topicName, topic, subs };
};

interface SubProps {
  shortName: string;
  namespaceFullName: Input<string>;
  topicFullName: Input<string>;
  group: ResourceGroupInfo;
  enableSession?: boolean;
  lock?: boolean;
  dependsOn?:
    | pulumi.Input<pulumi.Resource>
    | pulumi.Input<pulumi.Input<pulumi.Resource>[]>;
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
}: SubProps): BasicResourceResultProps<bus.Subscription> => {
  const name = getSubscriptionName(shortName);

  const resource = new bus.Subscription(
    name,
    {
      subscriptionName: name,
      resourceGroupName: group.resourceGroupName,
      topicName: topicFullName,
      namespaceName: namespaceFullName,
      ...defaultValues,
      requiresSession: enableSession,
    },
    { dependsOn }
  );

  if (lock) {
    Locker({ name, resourceId: resource.id, dependsOn: resource });
  }

  return { name, resource };
};

interface QueueProps
  extends Pick<ConnCreatorProps, "removeEntityPath" | "transportType"> {
  shortName: string;
  version: number;
  namespaceFullName: string;
  vaultInfo?: KeyVaultInfo;
  group: ResourceGroupInfo;
  lock?: boolean;
  dependsOn?:
    | pulumi.Input<pulumi.Resource>
    | pulumi.Input<pulumi.Input<pulumi.Resource>[]>;
}

interface QueueResultProps {
  name: string;
  queue: bus.Queue;
}

/** Queue creator */
const queueCreator = async ({
  group,
  namespaceFullName,
  shortName,
  vaultInfo,
  version,
  lock = true,
  dependsOn,
  ...others
}: QueueProps): Promise<QueueResultProps> => {
  const name = getQueueName(shortName, version);

  const queue = new bus.Queue(
    name,
    {
      queueName: name,
      namespaceName: namespaceFullName,
      ...defaultValues,
      duplicateDetectionHistoryTimeWindow: duplicateDetectedTime,
      resourceGroupName: group.resourceGroupName,
    },
    { dependsOn }
  );

  if (lock) {
    Locker({ name, resourceId: queue.id, dependsOn: queue });
  }

  if (vaultInfo) {
    //Send Key
    await createAndStoreConnection({
      queueName: name,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Send,
      dependsOn: queue,
      ...others,
    });

    //Listen Key
    await createAndStoreConnection({
      queueName: name,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Listen,
      dependsOn: queue,
      ...others,
    });

    //Manage Key
    await createAndStoreConnection({
      queueName: name,
      namespaceName: namespaceFullName,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Manage,
      dependsOn: queue,
      ...others,
    });
  }

  return { name, queue };
};

interface Props
  extends BasicResourceArgs,
    Pick<ConnCreatorProps, "removeEntityPath" | "transportType"> {
  topics?: Array<
    Omit<TopicProps, "group" | "namespaceFullName" | "vaultInfo" | "dependsOn">
  >;
  queues?: Array<
    Omit<QueueProps, "group" | "namespaceFullName" | "vaultInfo" | "dependsOn">
  >;
  drConfig?: {
    alias?: pulumi.Input<string>;
    alternateName: pulumi.Input<string>;
    partnerNamespace: pulumi.Input<string>;
  };
  network?: {
    whitelistIps?: Array<Input<string>>;
    enablePrivateLink?: boolean;
  } & Partial<PrivateLinkProps>;
  monitoring?: BasicMonitorArgs;
  sku?: bus.SkuName;
  vaultInfo?: KeyVaultInfo;
  createNamespaceConnections?: boolean;
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
  createNamespaceConnections,
  sku = bus.SkuName.Standard,
  monitoring,
  ...others
}: Props): Promise<
  ResourceResultProps<bus.Namespace> & {
    queues?: QueueResultProps[];
    topics?: TopicResultProps[];
  }
> => {
  name = getServiceBusName(name);

  const { resource, locker, diagnostic } = await creator(bus.Namespace, {
    namespaceName: name,
    ...group,
    sku: { name: sku, tier: sku },

    tags: defaultTags,
    ...others,

    monitoring: {
      ...monitoring,
      logsCategories: ["OperationalLogs"],
    },
  } as bus.NamespaceArgs & DefaultResourceArgs);

  const namespace = resource as bus.Namespace;

  if (drConfig && sku === bus.SkuName.Premium) {
    new bus.DisasterRecoveryConfig(name, {
      namespaceName: namespace.name,
      resourceGroupName: group.resourceGroupName,
      ...drConfig,
    });
  }

  //Create Keys
  if (vaultInfo && createNamespaceConnections) {
    //Send Key
    await createAndStoreConnection({
      namespaceName: name,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Send,
      dependsOn: resource,
      ...others,
    });

    //Listen Key
    await createAndStoreConnection({
      namespaceName: name,
      resourceGroupName: group.resourceGroupName,
      vaultInfo,
      connectionType: BusConnectionTypes.Listen,
      dependsOn: resource,
      ...others,
    });

    //Manage Key
    await createAndStoreConnection({
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
    tps = await Promise.all(
      topics.map((t) =>
        topicCreator({
          group,
          namespaceFullName: name,
          vaultInfo,
          ...t,
          dependsOn: resource,
          ...others,
        })
      )
    );
  }

  let qes: Array<QueueResultProps> | undefined = undefined;
  if (queues) {
    qes = await Promise.all(
      queues.map((t) =>
        queueCreator({
          group,
          namespaceFullName: name,
          vaultInfo,
          ...t,
          dependsOn: resource,
          ...others,
        })
      )
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
        defaultAction: "Deny",

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
        subnetId: network.subnetId!,
        useGlobalDnsZone: network.useGlobalDnsZone,
        resourceId: namespace.id,
        linkServiceGroupIds: ["namespace"],
        privateDnsZoneName: "privatelink.servicebus.windows.net",
      });
    }
  }

  return {
    name,
    resource: namespace,
    queues: qes,
    topics: tps,
    locker,
    diagnostic,
  };
};
