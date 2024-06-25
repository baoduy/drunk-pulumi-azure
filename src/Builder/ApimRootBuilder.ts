import { ResourceInfo } from "../types";
import { ApimProductBuilder } from "./ApimProductBuilder";
import {
  ApimChildBuilderProps,
  BuilderProps,
  IApimProductBuilder,
} from "./types";

export default class ApimRootBuilder {
  private constructor(private props: ApimChildBuilderProps) {}

  public static from(
    apimInfo: ResourceInfo,
    props: Omit<BuilderProps, "group" | "name">,
  ): ApimRootBuilder {
    return new ApimRootBuilder({
      ...props,
      name: apimInfo.resourceName,
      apimServiceName: apimInfo.resourceName,
      group: apimInfo.group,
    });
  }

  public newProduct(name: string): IApimProductBuilder {
    return new ApimProductBuilder({ ...this.props, name });
  }
}
