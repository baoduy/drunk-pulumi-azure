import { input as inputs } from '@pulumi/azure-native/types';
import { Input } from '@pulumi/pulumi';
import { NamedType, ResourceInfo } from '../../types';
import { IApimPolicyBuilder } from './apimPolicyBuilder';
import { BuilderProps, IBuilderAsync } from './genericBuilder';

export type ApimChildBuilderProps = BuilderProps & {
  apimServiceName: string;
};

export type ApimProductSubscriptionBuilderType = {
  approvalRequired: boolean;
  subscriptionsLimit: number;
};

export type APimApiBuilderFunction = (
  builder: IApimApiServiceBuilder,
) => IApimApiBuilder;

export type ApimApiServiceUrlType = {
  serviceUrl: Input<string>;
  apiPath: Input<string>;
};
export type ApimApiKeysType = { header?: Input<string>; query?: Input<string> };
export type ApimApiPolicyType = (
  builder: IApimPolicyBuilder,
) => IApimPolicyBuilder;

export type VersionBuilderFunction = (
  builder: IApimApiRevisionBuilder,
) => IApimApiRevisionBuilder;
export type ApimApiVersionType = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | string;
export type ApimApiOperationType = NamedType & {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  urlTemplate: Input<string>;
  responses?: Input<Input<inputs.apimanagement.ResponseContractArgs>[]>;
};
export type ApimApiRevisionProps =
  | {
      revision: number;
      swaggerUrl: string;
    }
  | {
      revision: number;
      operations: ApimApiOperationType[];
    };

export interface IApimApiRevisionBuilder {
  withRevision(props: ApimApiRevisionProps): IApimApiRevisionBuilder;
}

export interface IApimApiServiceBuilder {
  withServiceUrl(props: ApimApiServiceUrlType): IApimApiBuilder;
}

export interface IApimApiBuilder extends IBuilderAsync<ResourceInfo> {
  withPolicies(props: ApimApiPolicyType): IApimApiBuilder;
  withKeys(props: ApimApiKeysType): IApimApiBuilder;
  withVersion(
    version: ApimApiVersionType,
    builder: VersionBuilderFunction,
  ): IApimApiBuilder;
}

export interface IApimProductBuilder extends IBuilderAsync<ResourceInfo> {
  requiredSubscription(
    props: ApimProductSubscriptionBuilderType,
  ): IApimProductBuilder;
  /** Allows to add multi APIs */
  withApi(props: APimApiBuilderFunction): IApimProductBuilder;
  withPolicies(props: ApimApiPolicyType): IApimProductBuilder;
  published(): IBuilderAsync<ResourceInfo>;
}
