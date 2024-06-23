import { SkuType } from "@pulumi/azure-native/apimanagement";
import { Input } from "@pulumi/pulumi";
import { IBuilder } from "./genericBuilder";
import { ResourceInfo } from "../../types";
import { AppInsightInfo } from "../../Logs/Helpers";

export type ApimSkuBuilderType = {
  sku: SkuType;
  capacity?: number;
};
export type ApimPublisherBuilderType = {
  publisherEmail: Input<string>;
  /** default is organization name */
  publisherName?: Input<string>;
  /** default is apimgmt-noreply@mail.windowsazure.com */
  notificationSenderEmail?:
    | "apimgmt-noreply@mail.windowsazure.com"
    | Input<string>;
};
export type ApimDomainBuilderType = {
  domain: Input<string>;
  certificate: Input<string>;
  certificatePassword?: Input<string>;
};

export interface IApimSkuBuilder {
  withSku(props: ApimSkuBuilderType): IApimPublisherBuilder;
}
export interface IApimPublisherBuilder {
  withPublisher(props: ApimPublisherBuilderType): IApimBuilder;
}
export interface IApimBuilder extends IBuilder<ResourceInfo> {
  withProxyDomain(props: ApimDomainBuilderType): IApimBuilder;
  withInsightLog(props: AppInsightInfo): IApimBuilder;
}
