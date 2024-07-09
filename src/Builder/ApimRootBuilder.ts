import { ResourceInfo } from '../types';
import { ApimProductBuilder } from './ApimProductBuilder';
import { ApimWorkspaceBuilder } from './ApimWorkspaceBuilder';
import {
  ApimChildBuilderProps,
  BuilderProps,
  IApimProductBuilder,
  IApimWorkspaceBuilder,
} from './types';

export default class ApimRootBuilder {
  private constructor(private props: ApimChildBuilderProps) {}

  public static from(
    apimInfo: ResourceInfo,
    props: Omit<BuilderProps, 'group' | 'name'>,
  ): ApimRootBuilder {
    return new ApimRootBuilder({
      ...props,
      name: apimInfo.name,
      apimServiceName: apimInfo.name,
      group: apimInfo.group,
    });
  }

  public newProduct(name: string): IApimProductBuilder {
    return new ApimProductBuilder({ ...this.props, name });
  }

  public newWorkspace(name: string): IApimWorkspaceBuilder {
    return new ApimWorkspaceBuilder({ ...this.props, name });
  }
}
