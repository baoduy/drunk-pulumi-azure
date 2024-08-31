import { ResourceInfo } from '../types';
import { ApimProductBuilder } from './ApimProductBuilder';
import * as apim from '@pulumi/azure-native/apimanagement';
import {
  ApimChildBuilderProps,
  BuilderProps,
  IApimProductBuilder,
} from './types';

export default class ApimRootBuilder {
  private constructor(private args: ApimChildBuilderProps) {}

  public static from(
    apimInfo: ResourceInfo,
    props: Omit<BuilderProps, 'group' | 'name'> = {},
  ): ApimRootBuilder {
    return new ApimRootBuilder({
      ...props,
      name: apimInfo.name,
      apimServiceName: apimInfo.name,
      group: apimInfo.group,
    });
  }

  public newProduct(name: string): IApimProductBuilder {
    return new ApimProductBuilder({ ...this.args, name });
  }

  public getPublicIPs() {
    const sv = apim.getApiManagementServiceOutput({
      serviceName: this.args.apimServiceName,
      resourceGroupName: this.args.group.resourceGroupName,
    });

    return {
      publicIP: sv.publicIPAddresses.apply((ip) => ip[0]),
      privateIP: sv.privateIPAddresses.apply((ip) => (ip ? ip[0] : undefined)),
    };
  }
  // public newWorkspace(name: string): IApimWorkspaceBuilder {
  //   return new ApimWorkspaceBuilder({ ...this.props, name });
  // }
}
