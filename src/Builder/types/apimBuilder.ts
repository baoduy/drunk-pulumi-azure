import { SkuType } from '@pulumi/azure-native/apimanagement';
import { Input } from '@pulumi/pulumi';
import { BuilderProps, IBuilder } from './genericBuilder';
import { PrivateLinkPropsType, ResourceInfo, WithLogInfo } from '../../types';

/**
 * Type for arguments passed to the APIM builder.
 */
export type ApimBuilderArgs = BuilderProps & WithLogInfo;

/**
 * Type for configuring SKU (Stock Keeping Unit) for APIM.
 */
export type ApimSkuBuilderType = {
  sku: SkuType;
  capacity?: number;
};

/**
 * Type for configuring publisher information for APIM.
 */
export type ApimPublisherBuilderType = {
  publisherEmail: Input<string>;
  /** Default is organization name */
  publisherName?: Input<string>;
  /** Default is apimgmt-noreply@mail.windowsazure.com */
  notificationSenderEmail?:
    | 'apimgmt-noreply@mail.windowsazure.com'
    | Input<string>;
};

/**
 * Type for configuring certificates for APIM.
 */
export type ApimCertBuilderType = {
  certificate: Input<string>;
  certificatePassword?: Input<string>;
};

/**
 * Type for configuring domain and certificates for APIM.
 */
export type ApimDomainBuilderType = {
  domain: Input<string>;
} & ApimCertBuilderType;

/**
 * Type for configuring additional locations for APIM.
 */
export type ApimAdditionalLocationType = {
  disableGateway?: Input<boolean>;
  location: string;
};

/**
 * Type for configuring availability zones for APIM.
 */
export type ApimZoneType = ['1', '2'] | ['1', '2', '3'];

/**
 * Type for configuring virtual network (VNet) for APIM.
 */
export type ApimVnetType = {
  enableGateway?: Input<boolean>;
  subnetId: Input<string>;
  /**
   * The type of VPN in which API Management service needs to be configured in.
   * None (Default Value) means the API Management service is not part of any Virtual Network,
   * External means the API Management deployment is set up inside a Virtual Network having an Internet Facing Endpoint,
   * and Internal means that API Management deployment is setup inside a Virtual Network having an Intranet Facing Endpoint only.
   */
  type: 'External' | 'Internal';
};

/**
 * Type for configuring private link for APIM.
 */
export type ApimPrivateLinkType = PrivateLinkPropsType & {
  disablePublicAccess?: boolean;
};

/**
 * Type for configuring authentication for APIM.
 */
export type ApimAuthType = {
  clientId: Input<string>;
  clientSecret: Input<string>;
  authority?: Input<string>;
  type:
    | 'facebook'
    | 'google'
    | 'microsoft'
    | 'twitter'
    | 'aad'
    | 'aadB2C'
    | string;
};

/**
 * Interface for building SKU configuration for APIM.
 */
export interface IApimSkuBuilder {
  /**
   * Configures the SKU for APIM.
   * @param props - The SKU configuration.
   * @returns The publisher builder instance.
   */
  withSku(props: ApimSkuBuilderType): IApimPublisherBuilder;
}

/**
 * Interface for building publisher configuration for APIM.
 */
export interface IApimPublisherBuilder {
  /**
   * Configures the publisher information for APIM.
   * @param props - The publisher configuration.
   * @returns The APIM builder instance.
   */
  withPublisher(props: ApimPublisherBuilderType): IApimBuilder;
}

/**
 * Interface for building authentication configuration for APIM.
 */
export interface IApimAuthBuilder {
  /**
   * Configures Entra ID authentication for APIM.
   * @returns The APIM builder instance.
   */
  withEntraID(): IApimBuilder;

  /**
   * Configures authentication for APIM.
   * @param props - The authentication configuration.
   * @returns The APIM builder instance.
   */
  withAuth(props: ApimAuthType): IApimBuilder;

  /**
   * Disables sign-in for APIM.
   * @returns The APIM builder instance.
   */
  disableSignIn(): IApimBuilder;
}

/**
 * Interface for building APIM configuration.
 */
export interface IApimBuilder extends IBuilder<ResourceInfo>, IApimAuthBuilder {
  /**
   * Configures a CA certificate for APIM.
   * @param props - The certificate configuration.
   * @returns The APIM builder instance.
   */
  withCACert(props: ApimCertBuilderType): IApimBuilder;

  /**
   * Configures a root certificate for APIM.
   * @param props - The certificate configuration.
   * @returns The APIM builder instance.
   */
  withRootCert(props: ApimCertBuilderType): IApimBuilder;

  /**
   * Configures a proxy domain for APIM.
   * @param props - The domain configuration.
   * @returns The APIM builder instance.
   */
  withProxyDomain(props: ApimDomainBuilderType): IApimBuilder;

  // withInsightLog(props: AppInsightInfo): IApimBuilder;

  /**
   * Configures additional locations for APIM.
   * @param props - The additional location configuration.
   * @returns The APIM builder instance.
   */
  withAdditionalLocation(props: ApimAdditionalLocationType): IApimBuilder;

  /**
   * Configures availability zones for APIM.
   * @param props - The zone configuration.
   * @returns The APIM builder instance.
   */
  withZones(props: ApimZoneType): IApimBuilder;

  /**
   * Configures a subnet for APIM.
   * @param props - The subnet configuration.
   * @returns The APIM builder instance.
   */
  withSubnet(props: ApimVnetType): IApimBuilder;

  /**
   * Configures a private link for APIM.
   * @param props - The private link configuration.
   * @returns The APIM builder instance.
   */
  withPrivateLink(props: ApimPrivateLinkType): IApimBuilder;

  /**
   * Restores APIM from a deleted state.
   * @returns The APIM builder instance.
   */
  restoreFomDeleted(): IApimBuilder;
}