import { Input } from "@pulumi/pulumi";
import { ResourceInfo } from "../../types";
import { IApimPolicyBuilder } from "./apimPolicyBuilder";
import { BuilderProps, IBuilder } from "./genericBuilder";

export type ApimChildBuilderProps = BuilderProps & {
  name: string;
  apimServiceName: string;
};

export type ApimProductSubscriptionBuilderType = {
  approvalRequired: boolean;
  subscriptionsLimit: number;
};

export type APimApiBuilderFunction = (
  builder: IApimApiServiceBuilder,
) => IApimApiBuilder;

export type ApimApiServiceUrlType = { url: Input<string> };
export type ApimApiKeysType = { header?: Input<string>; query?: Input<string> };
export type ApimApiPolicyType = (
  builder: IApimPolicyBuilder,
) => IApimPolicyBuilder;

export interface IApimApiServiceBuilder {
  withServiceUrl(props: ApimApiServiceUrlType): IApimApiBuilder;
}

export interface IApimApiBuilder extends IBuilder<ResourceInfo> {
  withKeys(props: ApimApiKeysType): IApimApiBuilder;
  withPolicies(props: ApimApiPolicyType): IApimApiBuilder;
  withVersion(version: string, builder: any): IApimApiBuilder;
}

export interface IApimProductBuilder extends IBuilder<ResourceInfo> {
  requiredSubscription(
    props: ApimProductSubscriptionBuilderType,
  ): IApimProductBuilder;
  /** Allows to add multi APIs */
  withApi(props: APimApiBuilderFunction): IApimProductBuilder;
}
