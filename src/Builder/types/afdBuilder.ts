import { PulumiCommand } from '@pulumi/pulumi/automation';
import { ResourceInfo } from '../../types';
import { IBuilder } from './genericBuilder';
import * as cdn from '@pulumi/azure-native/cdn';
import * as pulumi from '@pulumi/pulumi';
/**
 * Type for configuring a CDN endpoint, omitting certain properties.
 */
export type AFDBuilderEndpoint = {
  name: string;
  origin: pulumi.Input<string>;
};

/** The header ley value configurations */
export type ResponseHeaderType = Record<string, string>;
/**
 * Interface for building a CDN resource.
 */
export interface IAFDBuilder extends IBuilder<ResourceInfo> {
  withSdk(sdk: cdn.SkuName): IAFDBuilder;
  withCustomDomains(domains: string[]): IAFDBuilder;
  withCustomDomainsIf(condition: boolean, domains: string[]): IAFDBuilder;
  withResponseHeaders(headers: ResponseHeaderType): IAFDBuilder;
  withResponseHeadersIf(
    condition: boolean,
    headers: ResponseHeaderType
  ): IAFDBuilder;
  withEndpoint(endpoint: AFDBuilderEndpoint): IAFDBuilder;
  withEndpointIf(condition: boolean, endpoint: AFDBuilderEndpoint): IAFDBuilder;
}
