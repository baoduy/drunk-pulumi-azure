import * as apim from "@pulumi/azure-native/apimanagement";
import { enums } from "@pulumi/azure-native/types";
import { Input, Output } from "@pulumi/pulumi";
import { getImportConfig } from "../Apim/ApiProduct/SwaggerHelper";
import { organization } from "../Common/StackEnv";
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
  extends BuilderAsync<void>
  implements IApimApiServiceBuilder, IApimApiBuilder
{
  private _serviceUrl: ApimApiServiceUrlType | undefined = undefined;
  private _keyParameters: ApimApiKeysType | undefined = undefined;
  private _apis: Record<string, ApimApiRevisionProps[]> = {};

  private _apiSets: Record<string, apim.ApiVersionSet> = {};

  public constructor(
    private props: ApimChildBuilderProps & {
      requiredSubscription: boolean;
      productId: Output<string>;
      policyString?: Input<string>;
    },
  ) {
    super(props);
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

  public async build() {
    const date = new Date();
    const tasks = Object.keys(this._apis).map((k) => {
      const setName = `${k}-apiSet`;
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
        { dependsOn: this.props.dependsOn },
      );
      this._apiSets[k] = apiSet;

      //Create Api
      const revisions = this._apis[k];
      return revisions.map(async (rv, index) => {
        const apiName = `${k}-${rv.revision}-api`;
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

            apiRevision: rv.revision,
            apiRevisionDescription: `${rv.revision} ${date.toLocaleDateString()}`,

            apiVersionSetId: apiSet.id,
            subscriptionKeyParameterNames: this._keyParameters,
            path: k,
            serviceUrl: `${this._serviceUrl}/${k}`,

            format:
              "swaggerUrl" in rv
                ? enums.apimanagement.ContentFormat.Openapi_json
                : undefined,
            value:
              "swaggerUrl" in rv
                ? await getImportConfig(
                    `${this._serviceUrl}/${rv.swaggerUrl}`,
                    k,
                  )
                : undefined,
          },
          { dependsOn: apiSet },
        );

        //Link API to Product
        new apim.ProductApi(
          apiName,
          {
            serviceName: this.props.apimServiceName,
            resourceGroupName: this.props.group.resourceGroupName,
            apiId: api.id,
            productId: this.props.productId,
          },
          { dependsOn: api },
        );

        //Apply Policy for the API
        if (this.props.policyString) {
          const policyName = `${apiName}-policy`;
          new apim.ApiPolicy(
            policyName,
            {
              serviceName: this.props.apimServiceName,
              resourceGroupName: this.props.group.resourceGroupName,
              apiId: api.id,
              policyId: "policy",
              format: "xml",
              value: this.props.policyString,
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
            new apim.ApiOperationPolicy(
              `${opsName}-policy`,
              {
                policyId: "policy",
                operationId: ops.id,
                apiId: api.id,
                serviceName: this.props.apimServiceName,
                resourceGroupName: this.props.group.resourceGroupName,
                format: "xml",
                value: new ApimPolicyBuilder()
                  .mockResponse({
                    code: 200,
                    contentType: `Welcome to ${organization}`,
                  })
                  .build(),
              },
              { dependsOn: ops },
            );
          });
        }
      });
    });

    await Promise.all(tasks);
  }
}
