import { naming } from '../Common';
import { ResourceInfo } from '../types';
import * as vdi from '@pulumi/azure-native/desktopvirtualization';
import {
  Builder,
  BuilderProps,
  IVdiBuilder,
  IVdiNetworkBuilder,
  IVdiOptionsBuilder,
  VdiBuilderAppGroupType,
  VdiBuilderNetworkType,
  VdiBuilderOptionsType,
} from './types';

class VdiBuilder
  extends Builder<ResourceInfo>
  implements IVdiNetworkBuilder, IVdiOptionsBuilder, IVdiBuilder
{
  private _appGroups: VdiBuilderAppGroupType[] = [];
  private _options: VdiBuilderOptionsType | undefined = undefined;
  private _network: VdiBuilderNetworkType | undefined = undefined;

  private _hostPoolInstance: vdi.HostPool | undefined = undefined;
  private readonly _hostPoolName: string;

  public constructor(props: BuilderProps) {
    super(props);
    this._hostPoolName = naming.getVdiName(this.commonProps.name);
  }

  withAppGroup(props: VdiBuilderAppGroupType): IVdiBuilder {
    this._appGroups.push(props);
    return this;
  }
  withOptions(props: VdiBuilderOptionsType): IVdiBuilder {
    this._options = props;
    return this;
  }
  withNetwork(props: VdiBuilderNetworkType): IVdiOptionsBuilder {
    this._network = props;
    return this;
  }

  private buildHost() {
    this._hostPoolInstance = new vdi.HostPool(this._hostPoolName, {
      description: `${this._hostPoolName} HostPool`,
      friendlyName: `${this._hostPoolName} HostPool`,
      identity: { type: vdi.ResourceIdentityType.SystemAssigned },
      personalDesktopAssignmentType: 'Automatic',
      startVMOnConnect: true,
      agentUpdate: {
        useSessionHostLocalTime: true,
        type: vdi.SessionHostComponentUpdateType.Scheduled,
        maintenanceWindows: [
          { dayOfWeek: 'Saturday', hour: 0 },
          { dayOfWeek: 'Sunday', hour: 0 },
        ],
      },
      customRdpProperty:
        'audiocapturemode:i:1;audiomode:i:0;targetisaadjoined:i:1',
      validationEnvironment: true,
      ...this.commonProps.group,
      ...this._options!,
    });
  }

  private buildAppGroups() {
    if (this._appGroups.length <= 0)
      this._appGroups.push({ applicationGroupType: 'Desktop' });

    const apps = this._appGroups.map((appGroup) => {
      const n = `${appGroup.applicationGroupType}-vdi-apps`;
      return new vdi.ApplicationGroup(
        n,
        {
          description: `${appGroup.applicationGroupType} VDI ApplicationGroup`,
          friendlyName: `${appGroup.applicationGroupType} VDI ApplicationGroup`,
          applicationGroupType: appGroup.applicationGroupType,
          hostPoolArmPath: this._hostPoolInstance!.id,
          ...this.commonProps.group,
        },
        { dependsOn: this._hostPoolInstance },
      );
    });

    const wp = new vdi.Workspace(
      this._hostPoolName!,
      {
        description: `${this._hostPoolName} Workspace`,
        friendlyName: `${this._hostPoolName} Workspace`,
        ...this.commonProps.group,
        applicationGroupReferences: apps.map((a) => a.id),
        sku: this._options?.sku,
        plan: this._options?.plan,
      },
      { dependsOn: apps },
    );
  }

  public build(): ResourceInfo {
    this.buildHost();
    this.buildAppGroups();

    return {
      name: this._hostPoolName!,
      group: this.commonProps.group,
      id: this._hostPoolInstance!.id,
    };
  }
}

export default (props: BuilderProps) =>
  new VdiBuilder(props) as IVdiNetworkBuilder;
