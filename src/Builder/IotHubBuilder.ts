import {
  Builder,
  IIotHubBuilder,
  IIotHubSkuBuilder,
  IotHubBuilderArgs,
  IotHubBusBuilderType,
  IotHubSkuBuilderType,
  IotHubStorageBuilderType,
} from './types';
import { ResourceInfo } from '../types';
import { naming, subscriptionId } from '../Common';
import { Input } from '@pulumi/pulumi';
import * as devices from '@pulumi/azure-native/iothub';
import { addCustomSecret } from '../KeyVault/CustomHelper';

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

class IotHubBuilder
  extends Builder<ResourceInfo>
  implements IIotHubSkuBuilder, IIotHubBuilder
{
  private readonly _instanceName: string;
  private _hubInstance: devices.IotHubResource | undefined = undefined;

  private readonly busQueueEndpointName = 'busQueue';
  private readonly busTopicEndpointName = 'busTopic';
  private readonly storageMessageEndpointName = 'hubStorage';
  private readonly storageEventEndpointName = 'hubEventStorage';
  private _routeEndpoints = new Array<string>();
  private _storageEndpoints = new Array<StorageEndpointPropertiesArgs>();

  private _routes: {
    condition: string;
    isEnabled: boolean;
    name: string;
    source: string;
    endpointNames: string[];
  }[] = [];

  private _sku: IotHubSkuBuilderType | undefined = undefined;
  private _bus: IotHubBusBuilderType | undefined = undefined;
  private _storage: IotHubStorageBuilderType | undefined = undefined;

  constructor(private args: IotHubBuilderArgs) {
    super(args);
    this._instanceName = naming.getIotHubName(args.name);
  }

  public withSku(props: IotHubSkuBuilderType): IIotHubBuilder {
    this._sku = props;
    return this;
  }
  public withBus(props: IotHubBusBuilderType): IIotHubBuilder {
    this._bus = props;
    return this;
  }
  public withStorage(props: IotHubStorageBuilderType): IIotHubBuilder {
    this._storage = props;
    return this;
  }

  private buildEndpoints() {
    const { group } = this.args;

    if (
      this._storage?.connectionString &&
      this._storage?.messageContainerName
    ) {
      this._routeEndpoints.push(this.storageMessageEndpointName);
      this._storageEndpoints.push({
        name: this.storageMessageEndpointName,
        resourceGroup: group.resourceGroupName,
        subscriptionId,
        connectionString: this._storage.connectionString,
        containerName: this._storage.messageContainerName,
        encoding: 'avro', // 'avroDeflate' and 'avro'
        batchFrequencyInSeconds: 60, //60 to 720
        fileNameFormat: '{iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm}', //Must have all these {iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm} but order and delimiter can be changed.
        maxChunkSizeInBytes: 300 * 1024 * 1024, // 10485760(10MB) and 524288000(500MB). Default value is 314572800(300MB).
      });
    }

    if (this._storage?.connectionString && this._storage?.eventContainerName) {
      this._storageEndpoints.push({
        name: this.storageEventEndpointName,
        resourceGroup: group.resourceGroupName,
        subscriptionId,
        connectionString: this._storage.connectionString,
        containerName: this._storage.eventContainerName,
        encoding: 'avro', // 'avroDeflate' and 'avro'
        batchFrequencyInSeconds: 60, //60 to 720
        fileNameFormat: '{iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm}', //Must have all these {iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm} but order and delimiter can be changed.
        maxChunkSizeInBytes: 300 * 1024 * 1024, // 10485760(10MB) and 524288000(500MB). Default value is 314572800(300MB).
      });
    }

    if (this._bus?.queueMessageConnectionString)
      this._routeEndpoints.push(this.busQueueEndpointName);
    if (this._bus?.topicMessageConnectionString)
      this._routeEndpoints.push(this.busTopicEndpointName);

    this._routes = this._routeEndpoints.map((r) => ({
      name: `routeMessageTo${r}`,
      source: devices.RoutingSource.DeviceMessages,
      endpointNames: [r],
      isEnabled: true,
      condition: 'true',
    }));

    if (this._storage?.eventContainerName) {
      this._routes.push({
        name: `routeMessageTo${this.storageEventEndpointName}`,
        source: devices.RoutingSource.DeviceLifecycleEvents,
        endpointNames: [this.storageEventEndpointName],
        isEnabled: true,
        condition: 'true',
      });
    }
  }

  private buildIot() {
    const { group, dependsOn, envUIDInfo } = this.args;

    this._hubInstance = new devices.IotHubResource(
      this._instanceName,
      {
        ...group,
        resourceName: this._instanceName,
        sku: this._sku!,

        identity: {
          type: envUIDInfo
            ? devices.ResourceIdentityType.SystemAssigned_UserAssigned
            : devices.ResourceIdentityType.SystemAssigned,
          userAssignedIdentities: envUIDInfo ? [envUIDInfo.id] : undefined,
        },

        properties: {
          //authorizationPolicies: [{}],
          //cloudToDevice:{}
          //comments
          enableFileUploadNotifications: Boolean(
            this._storage?.fileContainerName,
          ),
          storageEndpoints: this._storage?.fileContainerName
            ? {
                $default: {
                  connectionString: this._storage.connectionString,
                  containerName: this._storage.fileContainerName,
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
              serviceBusQueues: this._bus?.queueMessageConnectionString
                ? [
                    {
                      name: this.busQueueEndpointName,
                      connectionString: this._bus.queueMessageConnectionString,
                      resourceGroup: group.resourceGroupName,
                      subscriptionId,
                    },
                  ]
                : undefined,

              serviceBusTopics: this._bus?.topicMessageConnectionString
                ? [
                    {
                      name: this.busTopicEndpointName,
                      connectionString: this._bus.topicMessageConnectionString,
                      resourceGroup: group.resourceGroupName,
                      subscriptionId,
                    },
                  ]
                : undefined,

              storageContainers: this._storageEndpoints,
            },
            fallbackRoute: {
              name: `$fallback`,
              condition: 'true',
              isEnabled: true,
              source: devices.RoutingSource.DeviceMessages,

              endpointNames: this._storage?.eventContainerName
                ? [this.storageEventEndpointName]
                : ['events'],
            },

            routes: this._routes,
          },
        },
      },
      { dependsOn },
    );
  }

  private buildSecrets() {
    const { group, vaultInfo } = this.args;
    if (!vaultInfo) return;

    this._hubInstance!.id.apply(async (id) => {
      if (!id) return;

      const keys = await devices.listIotHubResourceKeys({
        resourceGroupName: group.resourceGroupName,
        resourceName: this._instanceName,
      });

      return keys.value?.forEach((k) => {
        const conn = `HostName=${this._instanceName}.azure-devices.net;SharedAccessKeyName=${
          k.keyName
        };SharedAccessKey=${k.primaryKey!}`;

        return addCustomSecret({
          name: `${this._instanceName}-${k.keyName}`,
          value: conn,
          vaultInfo,
          contentType: 'IOT Hub',
          dependsOn: this._hubInstance,
        });
      });
    });
  }
  public build(): ResourceInfo {
    this.buildEndpoints();
    this.buildIot();
    this.buildSecrets();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._hubInstance!.id,
    };
  }
}

export default (props: IotHubBuilderArgs) =>
  new IotHubBuilder(props) as IIotHubSkuBuilder;
