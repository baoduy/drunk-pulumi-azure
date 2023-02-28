import { BasicResourceArgs } from '../../types';
import { getIotHubName } from '../../Common/Naming';
import * as devices from '@pulumi/azure-native/devices';
import { defaultTags, subscriptionId } from '../../Common/AzureEnv';
import { Input } from '@pulumi/pulumi';

interface Props extends BasicResourceArgs {
  sku: {
    name: string;
    capacity?: number;
  };

  serviceBus?: {
    queueConnectionString?: Input<string>;
    topicConnectionString?: Input<string>;
  };
  storage?: {
    connectionString: Input<string>;
    fileContainerName: Input<string>;
    messageContainerName: Input<string>;
  };
}

export default ({
  name,
  group,
  sku = { name: 'F1', capacity: 1 },
  storage,
  serviceBus,
  dependsOn,
}: Props) => {
  const hubName = getIotHubName(name);
  const busQueueEndpointName = 'busQueue';
  const busTopicEndpointName = 'busTopic';
  const storageEndpointName = 'hubStorage';
  const routeEndpoints = new Array<string>();

  if (serviceBus?.queueConnectionString)
    routeEndpoints.push(busQueueEndpointName);
  if (serviceBus?.topicConnectionString)
    routeEndpoints.push(busTopicEndpointName);
  if (storage?.connectionString && storage?.messageContainerName)
    routeEndpoints.push(storageEndpointName);

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
        storageEndpoints: storage
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
        //networkRuleSets: {},
        messagingEndpoints: {
          fileNotifications: {
            lockDurationAsIso8601: 'PT1M',
            maxDeliveryCount: 10,
            ttlAsIso8601: 'PT1H',
          },
        },
        minTlsVersion: '1.2',
        //privateEndpointConnections: {},
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

            storageContainers: storage
              ? [
                  {
                    name: storageEndpointName,
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,
                    connectionString: storage.connectionString,
                    containerName: storage.messageContainerName,
                    encoding: 'avro',

                    /**
                     * Time interval at which blobs are written to storage. Value should be between 60 and 720 seconds. Default value is 300 seconds.
                     */
                    batchFrequencyInSeconds: 60,
                    /**
                     * File name format for the blob. Default format is {iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm}. All parameters are mandatory but can be reordered.
                     */
                    //fileNameFormat: string,
                    /**
                     * Maximum number of bytes for each blob written to storage. Value should be between 10485760(10MB) and 524288000(500MB). Default value is 314572800(300MB).
                     */
                    //maxChunkSizeInBytes?: pulumi.Input<number>;
                  },
                ]
              : undefined,
          },
          fallbackRoute: {
            name: `$fallback`,
            condition: 'true',
            endpointNames: ['events'],
            isEnabled: true,
            source: devices.RoutingSource.DeviceMessages,
          },
          routes: [
            {
              name: 'hubRouteMessage',
              source: devices.RoutingSource.DeviceMessages,
              endpointNames: routeEndpoints,
              isEnabled: true,
              condition: 'true',
            },
            // {
            //   name: 'hubRouteLifeCycleEvents',
            //   source: devices.RoutingSource.DeviceJobLifecycleEvents,
            //   endpointNames: routeEndpoints,
            //   isEnabled: true,
            //   condition: 'true',
            // },
            // {
            //   name: 'hubRouteJobLifeCycleEvents',
            //   source: devices.RoutingSource.DeviceJobLifecycleEvents,
            //   endpointNames: routeEndpoints,
            //   isEnabled: true,
            //   condition: 'true',
            // },
            // {
            //   name: 'hubRouteTwinChangeEvents',
            //   source: devices.RoutingSource.TwinChangeEvents,
            //   endpointNames: routeEndpoints,
            //   isEnabled: true,
            //   condition: 'true',
            // },
            // {
            //   name: 'hubRouteInvalid',
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

  return hub;
};
