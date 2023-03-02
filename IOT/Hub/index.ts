import { BasicResourceArgs } from '../../types';
import { getIotHubName } from '../../Common/Naming';
import * as devices from '@pulumi/azure-native/devices';
import { defaultTags, subscriptionId } from '../../Common/AzureEnv';
import { Input } from '@pulumi/pulumi';
import Locker from '../../Core/Locker';

interface Props extends BasicResourceArgs {
  sku: {
    name: devices.IotHubSku;
    capacity?: number;
  };

  serviceBus?: {
    queueConnectionString?: Input<string>;
    topicConnectionString?: Input<string>;
  };
  storage?: {
    enableRouteFallback?: boolean;
    connectionString: Input<string>;
    fileContainerName?: Input<string>;
    messageContainerName?: Input<string>;
  };

  lock?: boolean;
}

export default ({
  name,
  group,
  sku = { name: 'F1', capacity: 1 },
  storage,
  serviceBus,
  dependsOn,
  lock,
}: Props) => {
  const hubName = getIotHubName(name);
  const busQueueEndpointName = 'busQueue';
  const busTopicEndpointName = 'busTopic';
  const storageEndpointName = 'hubStorage';
  let routeEndpoints = ['events'];

  if (storage?.connectionString && storage?.messageContainerName)
    routeEndpoints.push(storageEndpointName);
  if (serviceBus?.queueConnectionString)
    routeEndpoints.push(busQueueEndpointName);
  if (serviceBus?.topicConnectionString)
    routeEndpoints.push(busTopicEndpointName);

  //The Free and Basic tiers only supports 1 endpoint.
  if (!sku.name.startsWith('S')) routeEndpoints = routeEndpoints.slice(-1);

  const hub = new devices.IotHubResource(
    hubName,
    {
      resourceName: hubName,
      ...group,

      sku,
      tags: defaultTags,

      properties: {
        //authorizationPolicies: [{}],
        //cloudToDevice:{}
        //comments
        enableFileUploadNotifications: Boolean(storage?.fileContainerName),
        storageEndpoints: storage?.fileContainerName
          ? {
              $default: {
                connectionString: storage.connectionString,
                containerName: storage.fileContainerName,
                sasTtlAsIso8601: 'PT1H',
              },
            }
          : undefined,

        //eventHubEndpoints: {},
        features: devices.v20160203.Capabilities.None,
        //ipFilterRules: {},
        // networkRuleSets: {
        //   applyToBuiltInEventHubEndpoint: true,
        //   defaultAction: 'Deny',
        //   ipRules: [
        //     {
        //       action: 'Allow',
        //       filterName: 'rule1',
        //       ipMask: '131.117.159.53',
        //     },
        //     {
        //       action: 'Allow',
        //       filterName: 'rule2',
        //       ipMask: '157.55.59.128/25',
        //     },
        //   ],
        // },
        //privateEndpointConnections: {},
        messagingEndpoints: {
          fileNotifications: {
            lockDurationAsIso8601: 'PT1M',
            maxDeliveryCount: 10,
            ttlAsIso8601: 'PT1H',
          },
        },
        minTlsVersion: '1.2',

        routing: {
          endpoints: {
            //eventHubs: [],
            serviceBusQueues: serviceBus?.queueConnectionString
              ? [
                  {
                    name: busQueueEndpointName,
                    connectionString: serviceBus.queueConnectionString,
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,
                  },
                ]
              : undefined,

            serviceBusTopics: serviceBus?.topicConnectionString
              ? [
                  {
                    name: busTopicEndpointName,
                    connectionString: serviceBus.topicConnectionString,
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,
                  },
                ]
              : undefined,

            storageContainers: storage?.messageContainerName
              ? [
                  {
                    name: storageEndpointName,
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,
                    connectionString: storage.connectionString,
                    containerName: storage.messageContainerName,
                    encoding: 'avro', // 'avroDeflate' and 'avro'
                    batchFrequencyInSeconds: 60, //60 to 720
                    fileNameFormat:
                      '{iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm}', //Must have all these {iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm} but order and delimiter can be changed.
                    maxChunkSizeInBytes: 300 * 1024 * 1024, // 10485760(10MB) and 524288000(500MB). Default value is 314572800(300MB).
                  },
                ]
              : undefined,
          },
          fallbackRoute: {
            name: `$fallback`,
            condition: 'true',
            isEnabled: true,
            source: devices.RoutingSource.DeviceMessages,

            endpointNames: storage?.enableRouteFallback
              ? [storageEndpointName]
              : ['events'],
          },

          routes: [
            {
              name: 'routeMessageToCustomEndpoints',
              source: devices.RoutingSource.DeviceMessages,
              endpointNames: routeEndpoints,
              isEnabled: true,
              condition: 'true',
            },
            {
              name: 'routeLifecycleToCustomEndpoints',
              source: devices.RoutingSource.DeviceLifecycleEvents,
              endpointNames: routeEndpoints,
              isEnabled: true,
              condition: 'true',
            },
            // {
            //   name: 'routeJobLifecycleToCustomEndpoints',
            //   source: devices.RoutingSource.DeviceJobLifecycleEvents,
            //   endpointNames: routeEndpoints,
            //   isEnabled: true,
            //   condition: 'true',
            // },
            // {
            //   name: 'routeTwinToCustomEndpoints',
            //   source: devices.RoutingSource.TwinChangeEvents,
            //   endpointNames: routeEndpoints,
            //   isEnabled: true,
            //   condition: 'true',
            // },
            // {
            //   name: 'routeInvalidToCustomEndpoints',
            //   source: devices.RoutingSource.Invalid,
            //   endpointNames: routeEndpoints,
            //   isEnabled: true,
            //   condition: 'true',
            // },
          ],
        },
      },
    },
    { dependsOn }
  );

  if (lock) {
    Locker({ name, resourceId: hub.id, dependsOn: hub });
  }

  return hub;
};
