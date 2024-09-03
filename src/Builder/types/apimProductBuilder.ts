import { input as inputs } from '@pulumi/azure-native/types';
import { Input } from '@pulumi/pulumi';
import { WithNamedType, ResourceInfo } from '../../types';
import { IApimPolicyBuilder } from './apimPolicyBuilder';
import { BuilderProps, IBuilderAsync } from './genericBuilder';

/**
 * Properties for building an APIM child resource.
 */
export type ApimChildBuilderProps = BuilderProps & {
  /**
   * The name of the APIM service.
   */
  apimServiceName: string;
};

/**
 * Properties for configuring APIM product subscriptions.
 */
export type ApimProductSubscriptionBuilderType = {
  /**
   * Indicates if approval is required for subscriptions.
   */
  approvalRequired: boolean;
  /**
   * The limit on the number of subscriptions.
   */
  subscriptionsLimit: number;
};

/**
 * Function type for building an APIM API.
 */
export type APimApiBuilderFunction = (
  /**
   * The API service builder.
   */
  builder: IApimApiServiceBuilder,
) => IApimApiBuilder;

/**
 * Properties for setting the service URL of an APIM API.
 */
export type ApimApiServiceUrlType = {
  /**
   * The service URL.
   */
  serviceUrl: Input<string>;
  /**
   * The API path.
   */
  apiPath: Input<string>;
};

/**
 * Properties for setting the keys of an APIM API.
 */
export type ApimApiKeysType = {
  /**
   * The header key.
   */
  header?: Input<string>;
  /**
   * The query key.
   */
  query?: Input<string>;
};

/**
 * Function type for building APIM API policies.
 */
export type ApimApiPolicyType = (
  /**
   * The policy builder.
   */
  builder: IApimPolicyBuilder,
) => IApimPolicyBuilder;

/**
 * Function type for building an APIM API version.
 */
// export type VersionBuilderFunction = (
//   /**
//    * The API revision builder.
//    */
//   builder: IApimApiRevisionBuilder,
// ) => IApimApiRevisionBuilder;

/**
 * Types of APIM API versions.
 */
export type ApimApiVersionType = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | string;

/**
 * Properties for defining an APIM API operation.
 */
export type ApimApiOperationType = WithNamedType & {
  /**
   * The HTTP method of the operation.
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  /**
   * The URL template of the operation.
   */
  urlTemplate?: Input<string>;
  /**
   * The responses of the operation.
   */
  responses?: Input<Input<inputs.apimanagement.ResponseContractArgs>[]>;

  policies?: ApimApiPolicyType;
};

/**
 * Properties for defining an APIM API revision.
 */
export type ApimApiProps =
  | {
      /**
       * The revision number.
       */
      //revision: number;
      /**
       * The URL of the Swagger definition.
       */
      swaggerUrl: string;
    }
  | {
      /**
       * The revision number.
       */
      //revision: number;
      /**
       * The operations of the API.
       */
      operations: ApimApiOperationType[];
    };

export type ApimHookProxyBuilderType = {
  subscriptionRequired?: boolean;
  authHeaderKey: string;
  hookHeaderKey: string;
};

/**
 * Interface for building an APIM API revision.
 */
// export interface IApimApiRevisionBuilder {
//   /**
//    * Sets the revision properties for the API.
//    * @param props - The revision properties.
//    * @returns An instance of IApimApiRevisionBuilder.
//    */
//   withRevision(props: ApimApiRevisionProps): IApimApiRevisionBuilder;
// }

/**
 * Interface for building an APIM API service.
 */
export interface IApimApiServiceBuilder {
  /**
   * Sets the service URL properties for the API.
   * @param props - The service URL properties.
   * @returns An instance of IApimApiBuilder.
   */
  withServiceUrl(props: ApimApiServiceUrlType): IApimApiBuilder;
}

/**
 * Interface for building an APIM API.
 */
export interface IApimApiBuilder extends IBuilderAsync<ResourceInfo> {
  /**
   * Sets the policies for the API.
   * @param props - The policy properties.
   * @returns An instance of IApimApiBuilder.
   */
  withPolicies(props: ApimApiPolicyType): IApimApiBuilder;

  /**
   * Sets the keys for the API.
   * @param props - The key properties.
   * @returns An instance of IApimApiBuilder.
   */
  withKeys(props: ApimApiKeysType): IApimApiBuilder;

  /**
   * Sets the version properties for the API.
   * @param version - The API version.
   * @param props - The props of API.
   * @returns An instance of IApimApiBuilder.
   */
  withVersion(
    version: ApimApiVersionType,
    props: ApimApiProps,
  ): IApimApiBuilder;
}

/**
 * Interface for building an APIM product.
 */
export interface IApimProductBuilder extends IBuilderAsync<ResourceInfo> {
  /**
   * Sets the subscription properties for the product.
   * @param props - The subscription properties.
   * @returns An instance of IApimProductBuilder.
   */
  requiredSubscription(
    props: ApimProductSubscriptionBuilderType,
  ): IApimProductBuilder;

  /**
   * Adds multiple APIs to the product.
   * @param name
   * @param props - The API builder function.
   * @returns An instance of IApimProductBuilder.
   */
  withApi(name: string, props: APimApiBuilderFunction): IApimProductBuilder;

  withHookProxy(
    name: string,
    props: ApimHookProxyBuilderType,
  ): IApimProductBuilder;
  /**
   * Sets the policies for the product.
   * @param props - The policy properties.
   * @returns An instance of IApimProductBuilder.
   */
  withPolicies(props: ApimApiPolicyType): IApimProductBuilder;

  /**
   * Publishes the product.
   * @returns An instance of IBuilderAsync<ResourceInfo>.
   */
  published(): IBuilderAsync<ResourceInfo>;
}
