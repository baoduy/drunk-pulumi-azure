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
        enableFileUploadNotifications: false,
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
                    name: 'busQueue',
                    connectionString: serviceBus.queueConnectionString,
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,
                  },
                ]
              : undefined,

            serviceBusTopics: serviceBus?.topicConnectionString
              ? [
                  {
                    name: 'busTopic',
                    connectionString: serviceBus.topicConnectionString,
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,
                  },
                ]
              : undefined,

            storageContainers: storage
              ? [
                  {
                    /**
                     * The name that identifies this endpoint. The name can only include alphanumeric characters, periods, underscores, hyphens and has a maximum length of 64 characters. The following names are reserved:  events, operationsMonitoringEvents, fileNotifications, $default. Endpoint names must be unique across endpoint types.
                     */
                    name: 'hubStorage',
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,

                    batchFrequencyInSeconds: 300,
                    connectionString: storage.connectionString,
                    containerName: storage.messageContainerName,
                    encoding: 'avro',
                    /**
                     * File name format for the blob. Default format is {iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm}. All parameters are mandatory but can be reordered.
                     */
                    //fileNameFormat?: pulumi.Input<string>;
                    /**
                     * Maximum number of bytes for each blob written to storage. Value should be between 10485760(10MB) and 524288000(500MB). Default value is 314572800(300MB).
                     */
                    //maxChunkSizeInBytes?: pulumi.Input<number>;
                  },
                ]
              : undefined,
          },
          // fallbackRoute: {
          //   condition: 'true',
          //   endpointNames: ['events'],
          //   isEnabled: true,
          //   name: `$fallback`,
          //   source: 'DeviceMessages',
          // },
          //routes: [],
        },
      },
    },
    { dependsOn }
  );

  return hub;
};
