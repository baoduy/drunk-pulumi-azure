import * as apim from "@pulumi/azure-native/apimanagement";
import { enums } from "@pulumi/azure-native/types";
import { Input, interpolate } from "@pulumi/pulumi";
import { getImportConfig } from "../Apim/ApiProduct/SwaggerHelper";
import { organization } from "../Common/StackEnv";
import { ResourceInfo } from "../types";
import ApimPolicyBuilder from "./ApimPolicyBuilder";

import {
  ApimApiKeysType,
  ApimApiServiceUrlType,
  ApimChildBuilderProps,
  IApimApiBuilder,
  IApimApiServiceBuilder,
  ApimApiRevisionProps,
  BuilderAsync,
  IApimApiRevisionBuilder,
  VersionBuilderFunction,
  ApimApiPolicyType,
} from "./types";

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
  private _serviceUrl: ApimApiServiceUrlType | undefined = undefined;
  private _keyParameters: ApimApiKeysType | undefined = {
    header: "x-api-key",
    query: "api-key",
  };
  private _apis: Record<string, ApimApiRevisionProps[]> = {};

  private _apiInstanceName: string;
  private _apiSets: Record<string, apim.ApiVersionSet> = {};
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
    this._keyParameters = props;
    return this;
  }

  private async buildApis() {
    const date = new Date();
    const tasks = Object.keys(this._apis).map((k) => {
      const setName = `${this._apiInstanceName}-v${k}`;
      //Create ApiSet
      const apiSet = new apim.ApiVersionSet(
        setName,
        {
          versionSetId: setName,
          displayName: setName,
          description: setName,
          serviceName: this.props.apimServiceName,
          resourceGroupName: this.props.group.resourceGroupName,
          versioningScheme: enums.apimanagement.VersioningScheme.Segment,
        },
        { dependsOn: this.props.dependsOn, deleteBeforeReplace: true },
      );
      this._apiSets[k] = apiSet;

      //Create Api
      const revisions = this._apis[k];
      return revisions.map(async (rv, index) => {
        const apiName = `${setName};rev=${rv.revision}`;
        const api = new apim.Api(
          apiName,
          {
            apiId: apiName,
            displayName: apiName,
            description: apiName,
            serviceName: this.props.apimServiceName,
            resourceGroupName: this.props.group.resourceGroupName,
            apiType: enums.apimanagement.ApiType.Http,
            isCurrent: index === revisions.length - 1,
            protocols: [enums.apimanagement.Protocol.Https],
            subscriptionRequired: this.props.requiredSubscription,

            apiVersion: k,
            apiVersionDescription: k,

            apiRevision: rv.revision.toString(),
            apiRevisionDescription: `${apiName} ${date.toLocaleDateString()}`,

            apiVersionSetId: apiSet.id,
            subscriptionKeyParameterNames: this._keyParameters,
            path: this._serviceUrl!.apiPath,
            serviceUrl: `${this._serviceUrl!.serviceUrl}/${k}`,

            format:
              "swaggerUrl" in rv
                ? enums.apimanagement.ContentFormat.Openapi_json
                : undefined,
            value:
              "swaggerUrl" in rv
                ? await getImportConfig(rv.swaggerUrl, k)
                : undefined,
          },
          { dependsOn: apiSet, deleteBeforeReplace: true },
        );

        //Link API to Product
        new apim.ProductApi(
          apiName,
          {
            serviceName: this.props.apimServiceName,
            resourceGroupName: this.props.group.resourceGroupName,
            productId: this.props.productId,
            apiId: apiName,
          },
          { dependsOn: api },
        );

        //Apply Policy for the API
        if (this._policyString) {
          new apim.ApiPolicy(
            `${apiName}-policy`,
            {
              serviceName: this.props.apimServiceName,
              resourceGroupName: this.props.group.resourceGroupName,
              apiId: apiName,
              policyId: "policy",
              format: "xml",
              value: this._policyString,
            },
            { dependsOn: api },
          );
        }

        //Create Aoi Operations
        if ("operations" in rv) {
          rv.operations.forEach((op) => {
            const opsName = `${apiName}-${op.name}`;
            const ops = new apim.ApiOperation(
              opsName,
              {
                operationId: opsName,
                apiId: api.id,
                displayName: opsName,
                description: opsName,
                serviceName: this.props.apimServiceName,
                resourceGroupName: this.props.group.resourceGroupName,
                ...op,
              },
              { dependsOn: api },
            );

            //Mock Operations
            const opName = `${opsName}-policy`;
            new apim.ApiOperationPolicy(
              opName,
              {
                policyId: "policy",
                operationId: ops.id,
                apiId: api.id,
                serviceName: this.props.apimServiceName,
                resourceGroupName: this.props.group.resourceGroupName,
                format: "xml",
                value: new ApimPolicyBuilder({
                  ...this.props,
                  name: opName,
                })
                  .mockResponse({
                    code: 200,
                    contentType: `Welcome to ${organization}`,
                  })
                  .build(),
              },
              { dependsOn: ops, deleteBeforeReplace: true },
            );
          });
        }
      });
    });

    await Promise.all(tasks);
  }

  public async build(): Promise<ResourceInfo> {
    await this.buildApis();

    return {
      resourceName: this._apiInstanceName,
      group: this.props.group,
      id: interpolate`${this.props.productId}`,
    };
  }
}
