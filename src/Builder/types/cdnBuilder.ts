import { CdnEndpointProps } from "../../Cdn/CdnEndpoint";
import { ResourceInfo } from "../../types";
import { IBuilder } from "./genericBuilder";

export type CdnBuilderEndpointType = Omit<
  CdnEndpointProps,
  "cdnProfileInfo" | "dependsOn" | "ignoreChanges" | "importUri"
>;

export interface ICdnBuilder extends IBuilder<ResourceInfo> {
  withEndpoint(props: CdnBuilderEndpointType): ICdnBuilder;
}
