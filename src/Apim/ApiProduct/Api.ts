import { ApimInfo } from '../../types';
import * as apim from '@pulumi/azure-native/apimanagement';
import { getResourceName } from '../../Common/ResourceEnv';
import { Input } from '@pulumi/pulumi';
import { enums, input as inputs } from '@pulumi/azure-native/types';
import { getPolicies, PoliciesProps } from './PolicyBuilder';
import { getImportConfig } from './SwaggerHelper';

const getApiSetName = (name: string) =>
  getResourceName(name, { prefix: '', suffix: 'set', includeOrgName: false });

const getApiName = (name: string) =>
  getResourceName(name, { prefix: '', suffix: 'api', includeOrgName: false });

const getApiPolicyName = (name: string) =>
  getResourceName(name, {
    prefix: '',
    suffix: 'policy',
    includeOrgName: false,
  });

const getOperationName = (name: string) =>
  getResourceName(name, { prefix: '', suffix: 'ops', includeOrgName: false });

interface OperationProps {
  apimInfo: ApimInfo;
  apiId: Input<string>;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  urlTemplate: Input<string>;
  policies?: PoliciesProps;
  /** Create a dummy response */
  responses?: Input<Input<inputs.apimanagement.ResponseContractArgs>[]>;
}

const createOperation = ({
  name,
  apimInfo,
  apiId,
  policies,
  responses,
  ...others
}: OperationProps) => {
  const opsName = getOperationName(name);
  //Max operationId is 80
  const opsId =
    opsName.length > 80 ? opsName.substring(opsName.length - 80) : opsName;

  const ops = new apim.ApiOperation(opsName, {
    operationId: opsId,
    apiId: apiId,
    displayName: opsName,
    description: opsName,
    serviceName: apimInfo.serviceName,
    resourceGroupName: apimInfo.group.resourceGroupName,
    responses,
    ...others,
  });

  //Mock operation response if the Responses is provided.
  if (responses) {
    if (policies) policies.mockResponse = true;
    else policies = { mockResponse: true };
  }

  if (policies) {
    const policyName = `${opsName}-policy`;
    new apim.ApiOperationPolicy(
      policyName,
      {
        policyId: 'policy',
        operationId: opsId,
        apiId,
        serviceName: apimInfo.serviceName,
        resourceGroupName: apimInfo.group.resourceGroupName,
        format: 'xml',
        value: getPolicies(policies),
      },
      { dependsOn: ops }
    );
  }
  return ops;
};

export interface ApiProps {
  name: string;
  product: apim.Product;
  apimInfo: ApimInfo;
  serviceUrl: string;
  versions?: Array<{ name: string; swaggerUrl?: string }>;
  subscriptionRequired?: boolean;
  policies?: PoliciesProps;
  authHeaderKey?: string;
  operations?: Array<Omit<OperationProps, 'apiId' | 'apimInfo'>>;
  enableApiSet?: boolean;
}

export const createApi = async ({
  name,
  apimInfo,
  versions = [{ name: 'v1' }],
  product,
  serviceUrl,
  authHeaderKey,
  policies,
  subscriptionRequired,
  operations,
  enableApiSet = true,
}: ApiProps) => {
  const setName = getApiSetName(name);

  let set: apim.ApiVersionSet | undefined;
  if (enableApiSet) {
    set = new apim.ApiVersionSet(setName, {
      versionSetId: setName,
      displayName: setName,
      description: setName,
      serviceName: apimInfo.serviceName,
      resourceGroupName: apimInfo.group.resourceGroupName,
      versioningScheme: enums.apimanagement.VersioningScheme.Segment,
    });
  }

  const apis = await Promise.all(
    versions.map(async (v) => {
      const date = new Date();
      const revision = date.getDate() + date.getMonth();
      const apiName = getApiName(name);

      const api = new apim.Api(apiName, {
        apiId: `${apiName};rev=${revision}`,
        displayName: setName,
        description: setName,
        serviceName: apimInfo.serviceName,
        resourceGroupName: apimInfo.group.resourceGroupName,

        apiType: enums.apimanagement.ApiType.Http,
        isCurrent: true,
        protocols: [enums.apimanagement.Protocol.Https],
        subscriptionRequired,

        apiVersion: enableApiSet ? v.name : undefined,
        apiVersionDescription: enableApiSet ? v.name : undefined,

        apiRevision: revision.toString(),
        apiRevisionDescription: date.toLocaleDateString(),

        apiVersionSetId: set?.id,
        subscriptionKeyParameterNames: {
          header: authHeaderKey,
          query: authHeaderKey,
        },

        path: name,
        serviceUrl: `${serviceUrl}/${v.name}`,

        format: v.swaggerUrl
          ? enums.apimanagement.ContentFormat.Openapi_json
          : undefined,
        value: v.swaggerUrl
          ? await getImportConfig(`${serviceUrl}/${v.swaggerUrl}`, v.name)
          : undefined,
      });

      if (product) {
        new apim.ProductApi(
          apiName,
          {
            serviceName: apimInfo.serviceName,
            resourceGroupName: apimInfo.group.resourceGroupName,
            apiId: apiName,
            productId: product.name,
          },
          { dependsOn: [api, product] }
        );
      }

      //Apply Default Policy to Api
      const policyName = getApiPolicyName(apiName);

      new apim.ApiPolicy(
        policyName,
        {
          serviceName: apimInfo.serviceName,
          resourceGroupName: apimInfo.group.resourceGroupName,
          apiId: api.name,
          policyId: 'policy',
          format: 'xml',
          value: getPolicies({
            cache: false,
            rateLimit: true,
            ...policies,
          }),
        },
        { dependsOn: [api, product] }
      );

      if (operations) {
        operations.map((ops) =>
          createOperation({
            apiId: api.name,
            apimInfo,
            ...ops,
          })
        );
      }

      return api;
    })
  );

  return { set, apis };
};
