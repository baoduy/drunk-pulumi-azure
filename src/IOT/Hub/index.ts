import { BasicResourceWithVaultArgs } from '../../types';
import { getIotHubName, subscriptionId } from '../../Common';
import * as devices from '@pulumi/azure-native/devices';
import { Input } from '@pulumi/pulumi';
import { addCustomSecret } from '../../KeyVault/CustomHelper';

type StorageEndpointPropertiesArgs = {
  name: Input<string>;
  resourceGroup: Input<string>;
  subscriptionId: Input<string>;
  connectionString: Input<string>;
  containerName: Input<string>;
  encoding: 'avro' | 'avroDeflate'; // 'avroDeflate' and 'avro'
  batchFrequencyInSeconds: Input<number>;
  fileNameFormat: Input<string>;
  maxChunkSizeInBytes: Input<number>;
};

interface Props extends BasicResourceWithVaultArgs {
  sku: {
    name: devices.IotHubSku;
    capacity?: number;
  };
  serviceBus?: {
    /** provide the queue connection string to enable message to be pushing to service bus queue */
    queueMessageConnectionString?: Input<string>;
    /** provide the topic connection string to enable message to be pushing to service bus topic */
    topicMessageConnectionString?: Input<string>;
  };
  storage?: {
    connectionString: Input<string>;
    /** provide the file container name to enable file to be upload in IOT hub*/
    fileContainerName?: Input<string>;
    /** provide the message container name to enable message to be pushing to storage */
    messageContainerName?: Input<string>;
    /** provide the event container name to enable events to be pushing to storage */
    eventContainerName?: Input<string>;
  };
}

export default ({
  name,
  group,
  sku = { name: 'F1', capacity: 1 },
  storage,
  serviceBus,
  dependsOn,
  vaultInfo,
}: Props) => {
  const hubName = getIotHubName(name);
  const busQueueEndpointName = 'busQueue';
  const busTopicEndpointName = 'busTopic';
  const storageMessageEndpointName = 'hubStorage';
  const storageEventEndpointName = 'hubEventStorage';

  const routeEndpoints = new Array<string>();
  const storageEndpoints = new Array<StorageEndpointPropertiesArgs>();

  if (storage?.connectionString && storage?.messageContainerName) {
    routeEndpoints.push(storageMessageEndpointName);
    storageEndpoints.push({
      name: storageMessageEndpointName,
      resourceGroup: group.resourceGroupName,
      subscriptionId,
      connectionString: storage.connectionString,
      containerName: storage.messageContainerName,
      encoding: 'avro', // 'avroDeflate' and 'avro'
      batchFrequencyInSeconds: 60, //60 to 720
      fileNameFormat: '{iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm}', //Must have all these {iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm} but order and delimiter can be changed.
      maxChunkSizeInBytes: 300 * 1024 * 1024, // 10485760(10MB) and 524288000(500MB). Default value is 314572800(300MB).
    });
  }
  if (storage?.connectionString && storage?.eventContainerName) {
    storageEndpoints.push({
      name: storageEventEndpointName,
      resourceGroup: group.resourceGroupName,
      subscriptionId,
      connectionString: storage.connectionString,
      containerName: storage.eventContainerName,
      encoding: 'avro', // 'avroDeflate' and 'avro'
      batchFrequencyInSeconds: 60, //60 to 720
      fileNameFormat: '{iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm}', //Must have all these {iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm} but order and delimiter can be changed.
      maxChunkSizeInBytes: 300 * 1024 * 1024, // 10485760(10MB) and 524288000(500MB). Default value is 314572800(300MB).
    });
  }

  if (serviceBus?.queueMessageConnectionString)
    routeEndpoints.push(busQueueEndpointName);
  if (serviceBus?.topicMessageConnectionString)
    routeEndpoints.push(busTopicEndpointName);

  const routes: Array<any> = routeEndpoints.map((r) => ({
    name: `routeMessageTo${r}`,
    source: devices.RoutingSource.DeviceMessages,
    endpointNames: [r],
    isEnabled: true,
    condition: 'true',
  }));

  if (storage?.eventContainerName) {
    routes.push({
      name: `routeMessageTo${storageEventEndpointName}`,
      source: devices.RoutingSource.DeviceLifecycleEvents,
      endpointNames: [storageEventEndpointName],
      isEnabled: true,
      condition: 'true',
    });
  }

  const hub = new devices.IotHubResource(
    hubName,
    {
      resourceName: hubName,
      ...group,

      sku,

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
        features: devices.Capabilities.None,
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
            serviceBusQueues: serviceBus?.queueMessageConnectionString
              ? [
                  {
                    name: busQueueEndpointName,
                    connectionString: serviceBus.queueMessageConnectionString,
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,
                  },
                ]
              : undefined,

            serviceBusTopics: serviceBus?.topicMessageConnectionString
              ? [
                  {
                    name: busTopicEndpointName,
                    connectionString: serviceBus.topicMessageConnectionString,
                    resourceGroup: group.resourceGroupName,
                    subscriptionId,
                  },
                ]
              : undefined,

            storageContainers: storageEndpoints,
          },
          fallbackRoute: {
            name: `$fallback`,
            condition: 'true',
            isEnabled: true,
            source: devices.RoutingSource.DeviceMessages,

            endpointNames: storage?.eventContainerName
              ? [storageEventEndpointName]
              : ['events'],
          },

          routes: routes,
        },
      },
    },
    { dependsOn },
  );

  //Connection Strings
  if (vaultInfo) {
    hub.id.apply(async (id) => {
      if (!id) return;

      const keys = await devices.listIotHubResourceKeys({
        resourceGroupName: group.resourceGroupName,
        resourceName: hubName,
      });

      return keys.value?.forEach((k) => {
        const conn = `HostName=${hubName}.azure-devices.net;SharedAccessKeyName=${
          k.keyName
        };SharedAccessKey=${k.primaryKey!}`;

        return addCustomSecret({
          name: `${hubName}-${k.keyName}`,
          value: conn,
          vaultInfo,
          contentType: 'IOT Hub',
        });
      });
    });
  }

  return hub;
};
