import { Input } from "@pulumi/pulumi";
import { ResourceInfo } from "../../types";
import { IBuilder } from "./genericBuilder";
import * as vdi from "@pulumi/azure-native/desktopvirtualization";

export type ResourceModelWithAllowedPropertySetSkuArgs = {
  /**
   * If the SKU supports scale out/in then the capacity integer should be included. If scale out/in is not possible for the resource this may be omitted.
   */
  capacity?: Input<number>;
  /**
   * If the service has different generations of hardware, for the same SKU, then that can be captured here.
   */
  family?: Input<string>;
  /**
   * The name of the SKU. Ex - P3. It is typically a letter+number code
   */
  name: Input<string>;
  /**
   * The SKU size. When the name field is the combination of tier and some other value, this would be the standalone code.
   */
  size?: Input<string>;
  /**
   * This field is required to be implemented by the Resource Provider if the service has more than one tier, but is not required on a PUT.
   */
  tier?: vdi.SkuTier;
};

export type ResourceModelWithAllowedPropertySetPlanArgs = {
  /**
   * A user defined name of the 3rd Party Artifact that is being procured.
   */
  name: Input<string>;
  /**
   * The 3rd Party artifact that is being procured. E.g. NewRelic. Product maps to the OfferID specified for the artifact at the time of Data Market onboarding.
   */
  product: Input<string>;
  /**
   * A publisher provided promotion code as provisioned in Data Market for the said product/artifact.
   */
  promotionCode?: Input<string>;
  /**
   * The publisher of the 3rd Party Artifact that is being bought. E.g. NewRelic
   */
  publisher: Input<string>;
  /**
   * The version of the desired product/artifact.
   */
  version?: Input<string>;
};

export type VdiBuilderNetworkType = {
  subnetId: Input<string>;
};

export type VdiBuilderOptionsType = {
  hostPoolType: vdi.HostPoolType;
  loadBalancerType: vdi.LoadBalancerType;
  preferredAppGroupType: vdi.ApplicationGroupType;
  maximumSessionsAllowed: number;
  sku: ResourceModelWithAllowedPropertySetSkuArgs;
  plan?: ResourceModelWithAllowedPropertySetPlanArgs;
};
export type VdiBuilderAppGroupType = {
  applicationGroupType: vdi.ApplicationGroupType;
};

export interface IVdiNetworkBuilder {
  withNetwork(props: VdiBuilderNetworkType): IVdiOptionsBuilder;
}

export interface IVdiOptionsBuilder {
  withOptions(props: VdiBuilderOptionsType): IVdiBuilder;
}

export interface IVdiBuilder extends IBuilder<ResourceInfo> {
  withAppGroup(props: VdiBuilderAppGroupType): IVdiBuilder;
}
