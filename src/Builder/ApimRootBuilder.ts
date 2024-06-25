import { ResourceInfo } from "../types";
import { ApimProductBuilder } from "./ApimProductBuilder";
import {
  ApimChildBuilderProps,
  BuilderProps,
  IApimProductBuilder,
} from "./types";

export class ApimRootBuilder {
  private constructor(private props: ApimChildBuilderProps) {}
  public static from(
    apimInfo: ResourceInfo,
    props: BuilderProps,
  ): ApimRootBuilder {
    return new ApimRootBuilder({
      ...props,
      apimServiceName: apimInfo.resourceName,
      group: apimInfo.group,
    });
  }

  public buildProduct(name: string): IApimProductBuilder {
    return new ApimProductBuilder({ ...this.props, name });
  }
}
