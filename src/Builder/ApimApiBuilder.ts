import * as apim from '@pulumi/azure-native/apimanagement';
import { enums } from '@pulumi/azure-native/types';
import { Input, interpolate } from '@pulumi/pulumi';
import { openApi } from '../Common';
import { ResourceInfo, WithDependsOn } from '../types';
import ApimPolicyBuilder from './ApimPolicyBuilder';
import {
  ApimApiKeysType,
  ApimApiOperationType,
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

  private readonly _apiInstanceName: string;
  private _policyString: string | undefined = undefined;

  public constructor(
    private args: ApimChildBuilderProps & {
      requiredSubscription: boolean;
      productId: Input<string>;
    },
  ) {
    super(args);
    this._apiInstanceName = `${args.name}-set`.toLowerCase();
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

  private buildOperations({
    operations,
    apiName,
    dependsOn,
  }: {
    apiName: string;
    operations: ApimApiOperationType[];
  } & WithDependsOn) {
    return operations.map((op) => {
      const opsName = op.name.replace(/\//g, '');
      const opsRsName = `${apiName}-ops-${opsName}-${op.method}`.toLowerCase();
      const apiOps = new apim.ApiOperation(
        opsRsName,
        {
          operationId: opsName,
          serviceName: this.args.apimServiceName,
          resourceGroupName: this.args.group.resourceGroupName,
          apiId: apiName,
          displayName: op.name,
          description: op.name,

          urlTemplate: op.urlTemplate ?? op.name,
          method: op.method,

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
          responses: op.responses ?? [
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
        { dependsOn },
      );

      if (op.policies) {
        const policyString = op
          .policies(
            new ApimPolicyBuilder({
              ...this.args,
              name: opsRsName,
            }),
          )
          .build();
        new apim.ApiOperationPolicy(opsRsName, {
          operationId: opsName,
          serviceName: this.args.apimServiceName,
          resourceGroupName: this.args.group.resourceGroupName,
          apiId: apiName,
          policyId: 'policy',
          format: 'xml',
          value: policyString,
        });
      }

      return apiOps;
    });
  }

  private buildApiDiagnostic({
    apiId,
    dependsOn,
  }: { apiId: string } & WithDependsOn) {
    new apim.ApiDiagnostic(
      `apim-${apiId}-apiDiagnostic`,
      {
        serviceName: this.args.apimServiceName,
        resourceGroupName: this.args.group.resourceGroupName,
        apiId,
        alwaysLog: apim.AlwaysLog.AllErrors,
        loggerId: `${this.args.apimServiceName}-appInsight`,
        diagnosticId: 'applicationinsights',
        backend: {
          request: {
            body: {
              bytes: 512,
            },
            headers: ['Content-type'],
          },
          response: {
            body: {
              bytes: 512,
            },
            headers: ['Content-type'],
          },
        },
        frontend: {
          request: {
            body: {
              bytes: 512,
            },
            headers: ['Content-type'],
          },
          response: {
            body: {
              bytes: 512,
            },
            headers: ['Content-type'],
          },
        },
        sampling: {
          percentage: 80,
          samplingType: apim.SamplingType.Fixed,
        },
      },
      { dependsOn },
    );
  }

  private async buildApis() {
    const date = new Date();
    const tasks = Object.keys(this._apis).map(async (v) => {
      const apiName = `${this.args.name}-${v}-api`.toLowerCase();
      const revision = 1;
      const apiRevName = `${apiName};rev=${revision}`;
      //Create Api
      const apiProps = this._apis[v];

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

          apiVersion: v,
          apiVersionDescription: `The version ${v} of ${this.args.name}`,

          apiRevision: revision.toString(),
          apiRevisionDescription: `${apiRevName} ${date.toLocaleDateString()}`,

          subscriptionKeyParameterNames: this._keyParameters,
          path: this._serviceUrl!.apiPath,
          serviceUrl: `${this._serviceUrl!.serviceUrl}/${v}`,

          format:
            'swaggerUrl' in apiProps
              ? enums.apimanagement.ContentFormat.Openapi_json
              : undefined,
          value:
            'swaggerUrl' in apiProps
              ? await openApi.getImportConfig(apiProps.swaggerUrl, v)
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
      // Apply Policy for the API
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

      //Diagnostic
      this.buildApiDiagnostic({ apiId: apiName, dependsOn: api });

      //Create Aoi Operations
      if ('operations' in apiProps) {
        this.buildOperations({
          apiName,
          operations: apiProps.operations,
          dependsOn: api,
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
