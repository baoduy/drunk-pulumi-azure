import { input as inputs } from '@pulumi/azure-native/types';
import { Input } from '@pulumi/pulumi';
import { WithNamedType, ResourceInfo } from '../../types';
import { IApimPolicyBuilder } from './apimPolicyBuilder';
import { BuilderProps, IBuilderAsync } from './genericBuilder';

/**
 * Properties for building an APIM child resource.
 */
export type ApimChildBuilderProps = BuilderProps & {
  apimServiceName: string;
};

/**
 * Properties for configuring APIM product subscriptions.
 */
export type ApimProductSubscriptionBuilderType = {
  approvalRequired: boolean;
  subscriptionsLimit: number;
};

/**
 * Function type for building an APIM API.
 */
export type APimApiBuilderFunction = (
  builder: IApimApiServiceBuilder,
) => IApimApiBuilder;

/**
 * Properties for setting the service URL of an APIM API.
 */
export type ApimApiServiceUrlType = {
  serviceUrl: Input<string>;
  apiPath: Input<string>;
};

/**
 * Properties for setting the keys of an APIM API.
 */
export type ApimApiKeysType = { header?: Input<string>; query?: Input<string> };

/**
 * Function type for building APIM API policies.
 */
export type ApimApiPolicyType = (
  builder: IApimPolicyBuilder,
) => IApimPolicyBuilder;

/**
 * Function type for building an APIM API version.
 */
export type VersionBuilderFunction = (
  builder: IApimApiRevisionBuilder,
) => IApimApiRevisionBuilder;

/**
 * Types of APIM API versions.
 */
export type ApimApiVersionType = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | string;

/**
 * Properties for defining an APIM API operation.
 */
export type ApimApiOperationType = WithNamedType & {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  urlTemplate: Input<string>;
  responses?: Input<Input<inputs.apimanagement.ResponseContractArgs>[]>;
};

/**
 * Properties for defining an APIM API revision.
 */
export type ApimApiRevisionProps =
  | {
      revision: number;
      swaggerUrl: string;
    }
  | {
      revision: number;
      operations: ApimApiOperationType[];
    };

/**
 * Interface for building an APIM API revision.
 */
export interface IApimApiRevisionBuilder {
  withRevision(props: ApimApiRevisionProps): IApimApiRevisionBuilder;
}

/**
 * Interface for building an APIM API service.
 */
export interface IApimApiServiceBuilder {
  withServiceUrl(props: ApimApiServiceUrlType): IApimApiBuilder;
}

/**
 * Interface for building an APIM API.
 */
export interface IApimApiBuilder extends IBuilderAsync<ResourceInfo> {
  withPolicies(props: ApimApiPolicyType): IApimApiBuilder;
  withKeys(props: ApimApiKeysType): IApimApiBuilder;
  withVersion(
    version: ApimApiVersionType,
    builder: VersionBuilderFunction,
  ): IApimApiBuilder;
}

/**
 * Interface for building an APIM product.
 */
export interface IApimProductBuilder extends IBuilderAsync<ResourceInfo> {
  requiredSubscription(
    props: ApimProductSubscriptionBuilderType,
  ): IApimProductBuilder;
  /** Allows to add multiple APIs */
  withApi(props: APimApiBuilderFunction): IApimProductBuilder;
  withPolicies(props: ApimApiPolicyType): IApimProductBuilder;
  published(): IBuilderAsync<ResourceInfo>;
}