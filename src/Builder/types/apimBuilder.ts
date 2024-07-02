import { SkuType } from "@pulumi/azure-native/apimanagement";
import { Input } from "@pulumi/pulumi";
import { IBuilder } from "./genericBuilder";
import { PrivateLinkPropsType, ResourceInfo } from "../../types";
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
export type ApimCertBuilderType = {
  certificate: Input<string>;
  certificatePassword?: Input<string>;
};
export type ApimDomainBuilderType = {
  domain: Input<string>;
} & ApimCertBuilderType;
export type ApimAdditionalLocationType = {
  disableGateway?: Input<boolean>;
  location: string;
};

export type ApimZoneType = ["1", "2"] | ["1", "2", "3"];
export type ApimVnetType = {
  enableGateway?: Input<boolean>;
  subnetId: Input<string>;
  /**
   * The type of VPN in which API Management service needs to be configured in. None (Default Value) means the API Management service is not part of any Virtual Network,
   * External means the API Management deployment is set up inside a Virtual Network having an Internet Facing Endpoint,
   * and Internal means that API Management deployment is setup inside a Virtual Network having an Intranet Facing Endpoint only.
   * */
  type: "External" | "Internal";
};
export type ApimPrivateLinkType = PrivateLinkPropsType & {
  disablePublicAccess?: boolean;
};
export type ApimAuthType = {
  clientId: Input<string>;
  clientSecret: Input<string>;
  authority?: Input<string>;
  type:
    | "facebook"
    | "google"
    | "microsoft"
    | "twitter"
    | "aad"
    | "aadB2C"
    | string;
};

export interface IApimSkuBuilder {
  withSku(props: ApimSkuBuilderType): IApimPublisherBuilder;
}
export interface IApimPublisherBuilder {
  withPublisher(props: ApimPublisherBuilderType): IApimBuilder;
}
export interface IApimAuthBuilder {
  withEntraID(): IApimBuilder;
  withAuth(props: ApimAuthType): IApimBuilder;
  disableSignIn(): IApimBuilder;
}
export interface IApimBuilder extends IBuilder<ResourceInfo>, IApimAuthBuilder {
  withCACert(props: ApimCertBuilderType): IApimBuilder;
  withRootCert(props: ApimCertBuilderType): IApimBuilder;
  withProxyDomain(props: ApimDomainBuilderType): IApimBuilder;
  withInsightLog(props: AppInsightInfo): IApimBuilder;
  /**Allows multi locations*/
  withAdditionalLocation(props: ApimAdditionalLocationType): IApimBuilder;
  withZones(props: ApimZoneType): IApimBuilder;
  withSubnet(props: ApimVnetType): IApimBuilder;
  withPrivateLink(props: ApimPrivateLinkType): IApimBuilder;
  restoreFomDeleted(): IApimBuilder;
}
