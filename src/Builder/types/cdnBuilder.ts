import { CdnEndpointProps } from "../../Cdn/CdnEndpoint";
import { ResourceInfo } from "../../types";
import { IBuilder } from "./genericBuilder";

/**
 * Type for configuring a CDN endpoint, omitting certain properties.
 */
export type CdnBuilderEndpointType = Omit<
  CdnEndpointProps,
  "cdnProfileInfo" | "dependsOn" | "ignoreChanges" | "importUri"
>;

/**
 * Interface for building a CDN resource.
 */
export interface ICdnBuilder extends IBuilder<ResourceInfo> {
  /**
   * Method to set properties for a CDN endpoint.
   * @param props - Properties for the CDN endpoint.
   * @returns An instance of ICdnBuilder.
   */
  withEndpoint(props: CdnBuilderEndpointType): ICdnBuilder;
}
