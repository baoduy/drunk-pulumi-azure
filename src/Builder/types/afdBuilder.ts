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

export type ResponseHeaderType = { header: string; value: string };
/**
 * Interface for building a CDN resource.
 */
export interface IAFDBuilder extends IBuilder<ResourceInfo> {
  withSdk(sdk: cdn.SkuName): IAFDBuilder;
  withCustomDomain(domain: string): IAFDBuilder;
  withResponseHeaders(headers: ResponseHeaderType[]): IAFDBuilder;
  withEndpoint(endpoint: AFDBuilderEndpoint): IAFDBuilder;
}
