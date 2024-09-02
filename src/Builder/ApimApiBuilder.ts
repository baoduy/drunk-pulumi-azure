import * as apim from '@pulumi/azure-native/apimanagement';
import { enums } from '@pulumi/azure-native/types';
import { Input, interpolate } from '@pulumi/pulumi';
import { openApi } from '../Common';
import { ResourceInfo } from '../types';
import ApimPolicyBuilder from './ApimPolicyBuilder';

import {
  ApimApiKeysType,
  ApimApiPolicyType,
  ApimApiRevisionProps,
  ApimApiServiceUrlType,
  ApimChildBuilderProps,
  BuilderAsync,
  IApimApiBuilder,
  IApimApiRevisionBuilder,
  IApimApiServiceBuilder,
  VersionBuilderFunction,
} from './types';

class ApimApiRevisionBuilder implements IApimApiRevisionBuilder {
  public revisions: ApimApiRevisionProps[] = [];
  public constructor(public version: string) {}
  withRevision(props: ApimApiRevisionProps): IApimApiRevisionBuilder {
    this.revisions.push(props);
    return this;
  }
}

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
  private _apis: Record<string, ApimApiRevisionProps[]> = {};

  private _apiInstanceName: string;
  private _policyString: string | undefined = undefined;

  public constructor(
    private props: ApimChildBuilderProps & {
      requiredSubscription: boolean;
      productId: Input<string>;
    },
  ) {
    super(props);
    this._apiInstanceName = `${props.name}-api`;
    //Empty Policy
    this._policyString = new ApimPolicyBuilder({
      ...props,
      name: this._apiInstanceName,
    }).build();
  }

  public withPolicies(props: ApimApiPolicyType): IApimApiBuilder {
    this._policyString = props(
      new ApimPolicyBuilder({
        ...this.props,
        name: this._apiInstanceName,
      }),
    ).build();
    return this;
  }

  public withServiceUrl(props: ApimApiServiceUrlType): IApimApiBuilder {
    this._serviceUrl = props;
    return this;
  }

  public withVersion(
    version: string,
    builder: VersionBuilderFunction,
  ): IApimApiBuilder {
    const b = new ApimApiRevisionBuilder(version);
    builder(b);
    this._apis[version] = b.revisions;
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
        serviceName: this.props.apimServiceName,
        resourceGroupName: this.props.group.resourceGroupName,
        versioningScheme: enums.apimanagement.VersioningScheme.Segment,
      },
      { dependsOn: this.props.dependsOn, deleteBeforeReplace: true },
    );
  }

  private async buildApis() {
    const date = new Date();
    const tasks = Object.keys(this._apis).map((k) => {
      const setName = `${this._apiInstanceName}-${k}`;

      //Create Api
      const revisions = this._apis[k];
      return revisions.map(async (rv, index) => {
        const apiRevName = `${setName};rev=${rv.revision}`;
        const api = new apim.Api(
          apiRevName,
          {
            apiId: apiRevName,
            apiVersionSetId: this._apiSetInstance!.id,
            displayName: apiRevName,
            description: apiRevName,
            serviceName: this.props.apimServiceName,
            resourceGroupName: this.props.group.resourceGroupName,
            apiType: enums.apimanagement.ApiType.Http,
            isCurrent: index === revisions.length - 1,
            protocols: [enums.apimanagement.Protocol.Https],
            subscriptionRequired: this.props.requiredSubscription,

            apiVersion: k,
            apiVersionDescription: k,

            apiRevision: rv.revision.toString(),
            apiRevisionDescription: `${apiRevName} ${date.toLocaleDateString()}`,

            subscriptionKeyParameterNames: this._keyParameters,
            path: this._serviceUrl!.apiPath,
            serviceUrl: `${this._serviceUrl!.serviceUrl}/${k}`,

            format:
              'swaggerUrl' in rv
                ? enums.apimanagement.ContentFormat.Openapi_json
                : undefined,
            value:
              'swaggerUrl' in rv
                ? await openApi.getImportConfig(rv.swaggerUrl, k)
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
          apiRevName,
          {
            serviceName: this.props.apimServiceName,
            resourceGroupName: this.props.group.resourceGroupName,
            productId: this.props.productId,
            apiId: apiRevName,
          },
          { dependsOn: api },
        );

        //Apply Policy for the API
        if (this._policyString) {
          new apim.ApiPolicy(
            `${apiRevName}-policy`,
            {
              serviceName: this.props.apimServiceName,
              resourceGroupName: this.props.group.resourceGroupName,
              apiId: apiRevName,
              policyId: 'policy',
              format: 'xml',
              value: this._policyString,
            },
            { dependsOn: api },
          );
        }

        //Create Aoi Operations
        if ('operations' in rv) {
          rv.operations.forEach((op) => {
            const opsName = `${setName}-ops-${op.name}`;
            new apim.ApiOperation(
              opsName,
              {
                ...op,
                operationId: op.name,
                apiId: setName,
                displayName: op.name,
                description: op.name,
                serviceName: this.props.apimServiceName,
                resourceGroupName: this.props.group.resourceGroupName,
              },
              { dependsOn: api },
            );
          });
        }
      });
    });

    await Promise.all(tasks);
  }

  public async build(): Promise<ResourceInfo> {
    this.buildApiSet();
    await this.buildApis();

    return {
      name: this._apiInstanceName,
      group: this.props.group,
      id: interpolate`${this.props.productId}`,
    };
  }
}
