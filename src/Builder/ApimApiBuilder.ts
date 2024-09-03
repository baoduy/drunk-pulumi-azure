import * as apim from '@pulumi/azure-native/apimanagement';
import { enums } from '@pulumi/azure-native/types';
import { Input, interpolate } from '@pulumi/pulumi';
import { openApi } from '../Common';
import { ResourceInfo } from '../types';
import ApimPolicyBuilder from './ApimPolicyBuilder';
import {
  ApimApiKeysType,
  ApimApiPolicyType,
  ApimApiProps,
  ApimApiServiceUrlType,
  ApimChildBuilderProps,
  BuilderAsync,
  IApimApiBuilder,
  IApimApiServiceBuilder,
} from './types';

export default class ApimApiBuilder
  extends BuilderAsync<ResourceInfo>
  implements IApimApiServiceBuilder, IApimApiBuilder
{
  private _apiSetInstance: apim.ApiVersionSet | undefined = undefined;

  private _serviceUrl: ApimApiServiceUrlType | undefined = undefined;
  private _keyParameters: ApimApiKeysType = {
    header: 'x-api-key',
    query: 'api-key',
  };
  private _apis: Record<string, ApimApiProps> = {};

  private _apiInstanceName: string;
  private _policyString: string | undefined = undefined;

  public constructor(
    private args: ApimChildBuilderProps & {
      requiredSubscription: boolean;
      productId: Input<string>;
    },
  ) {
    super(args);
    this._apiInstanceName = `${args.name}-set`;
    //Empty Policy
    this._policyString = new ApimPolicyBuilder({
      ...args,
      name: this._apiInstanceName,
    }).build();
  }

  public withPolicies(props: ApimApiPolicyType): IApimApiBuilder {
    this._policyString = props(
      new ApimPolicyBuilder({
        ...this.args,
        name: this._apiInstanceName,
      }),
    ).build();
    return this;
  }

  public withServiceUrl(props: ApimApiServiceUrlType): IApimApiBuilder {
    this._serviceUrl = props;
    return this;
  }

  public withVersion(version: string, props: ApimApiProps): IApimApiBuilder {
    this._apis[version] = props;
    return this;
  }

  public withKeys(props: ApimApiKeysType): IApimApiBuilder {
    this._keyParameters = { ...this._keyParameters, ...props };
    return this;
  }

  private buildApiSet() {
    //Create ApiSet
    this._apiSetInstance = new apim.ApiVersionSet(
      this._apiInstanceName,
      {
        versionSetId: this._apiInstanceName,
        displayName: this._apiInstanceName,
        description: this._apiInstanceName,
        serviceName: this.args.apimServiceName,
        resourceGroupName: this.args.group.resourceGroupName,
        versioningScheme: enums.apimanagement.VersioningScheme.Segment,
      },
      { dependsOn: this.args.dependsOn, deleteBeforeReplace: true },
    );
  }

  private async buildApis() {
    const date = new Date();
    const tasks = Object.keys(this._apis).map(async (k) => {
      const apiName = `${this.args.name}-${k}-api`;
      const revision = 1;
      const apiRevName = `${apiName};rev=${revision}`;
      //Create Api
      const apiProps = this._apis[k];

      const api = new apim.Api(
        apiName,
        {
          apiId: apiName,
          apiVersionSetId: this._apiSetInstance!.id,
          displayName: apiName,
          description: apiName,
          serviceName: this.args.apimServiceName,
          resourceGroupName: this.args.group.resourceGroupName,
          apiType: enums.apimanagement.ApiType.Http,
          isCurrent: true,
          protocols: [enums.apimanagement.Protocol.Https],
          subscriptionRequired: this.args.requiredSubscription,

          apiVersion: k,
          apiVersionDescription: k,

          apiRevision: revision,
          apiRevisionDescription: `${apiRevName} ${date.toLocaleDateString()}`,

          subscriptionKeyParameterNames: this._keyParameters,
          path: this._serviceUrl!.apiPath,
          serviceUrl: `${this._serviceUrl!.serviceUrl}/${k}`,

          format:
            'swaggerUrl' in apiProps
              ? enums.apimanagement.ContentFormat.Openapi_json
              : undefined,
          value:
            'swaggerUrl' in apiProps
              ? await openApi.getImportConfig(apiProps.swaggerUrl, k)
              : undefined,
        },
        {
          dependsOn: this._apiSetInstance,
          deleteBeforeReplace: true,
          customTimeouts: { create: '20m', update: '20m' },
        },
      );

      //Link API to Product
      new apim.ProductApi(
        apiName,
        {
          serviceName: this.args.apimServiceName,
          resourceGroupName: this.args.group.resourceGroupName,
          productId: this.args.productId,
          apiId: apiName,
        },
        { dependsOn: api },
      );
      //Apply Policy for the API
      if (this._policyString) {
        new apim.ApiPolicy(
          `${apiName}-policy`,
          {
            serviceName: this.args.apimServiceName,
            resourceGroupName: this.args.group.resourceGroupName,
            apiId: apiName,
            policyId: 'policy',
            format: 'xml',
            value: this._policyString,
          },
          { dependsOn: api },
        );
      }

      //Create Aoi Operations
      if ('operations' in apiProps) {
        apiProps.operations.map((op) => {
          const opsName = `${apiRevName}-ops-${op.name}`;
          return new apim.ApiOperation(
            opsName,
            {
              ...op,
              operationId: op.name,
              apiId: apiRevName,
              displayName: op.name,
              description: op.name,
              serviceName: this.args.apimServiceName,
              resourceGroupName: this.args.group.resourceGroupName,
              request: {
                description: op.name,
                headers: [],
                queryParameters: [],
                representations: [
                  {
                    contentType: 'application/json',
                  },
                ],
              },
              responses: [
                {
                  description: 'successful operation',
                  headers: [],
                  representations: [
                    {
                      contentType: 'application/json',
                    },
                  ],
                  statusCode: 200,
                },
              ],
            },
            { dependsOn: api },
          );
        });
      }
    });

    await Promise.all(tasks);
  }

  public async build(): Promise<ResourceInfo> {
    this.buildApiSet();
    await this.buildApis();

    return {
      name: this._apiInstanceName,
      group: this.args.group,
      id: interpolate`${this.args.productId}`,
    };
  }
}
