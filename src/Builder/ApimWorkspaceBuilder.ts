import { ResourceInfo } from '../types';
import * as apim from '@pulumi/azure-native/apimanagement';
import { ApimChildBuilderProps, Builder, IApimWorkspaceBuilder } from './types';

export class ApimWorkspaceBuilder
  extends Builder<ResourceInfo>
  implements IApimWorkspaceBuilder
{
  private _wpInstanceName: string;
  private _wpInstance: apim.Workspace | undefined = undefined;

  public constructor(private props: ApimChildBuilderProps) {
    super(props);
    this._wpInstanceName = `${props.name}-wp`;
  }

  private buildWp() {
    this._wpInstance = new apim.Workspace(this._wpInstanceName, {
      workspaceId: this._wpInstanceName,
      description: this._wpInstanceName,
      displayName: this._wpInstanceName,

      serviceName: this.props.apimServiceName,
      resourceGroupName: this.props.apimServiceName,
    });
  }

  public build(): ResourceInfo {
    this.buildWp();

    return {
      name: this._wpInstanceName,
      group: this.props.group,
      id: this._wpInstance!.id,
    };
  }
}
