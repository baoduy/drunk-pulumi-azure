import { ResourceInfo } from '../types';
import * as frontdoor from '@pulumi/azure-native/frontdoor';
import { naming } from '../Common';
import { Builder, BuilderProps } from './types';
import {
  IFrontDoorBuilder,
  FrontDoorBuilderEndpointType,
} from './types/frontDoorBuilder';

export class FrontDoorBuilder
  extends Builder<ResourceInfo>
  implements IFrontDoorBuilder
{
  private _name: string;
  private _profileInfo: frontdoor.FrontDoor | undefined;
  private _endpoints: FrontDoorBuilderEndpointType[] = [];

  public constructor(props: BuilderProps) {
    super(props);
    this._name = naming.getCdnEndpointName(props.name);
  }

  public withEndpoint(props: FrontDoorBuilderEndpointType): IFrontDoorBuilder {
    this._endpoints.push(props);
    return this;
  }

  private buildProfile() {
    this._profileInfo = new frontdoor.FrontDoor(this._name, {
      ...this.commonProps.group,
      location: 'global',
      enabledState: 'Enabled',
      frontDoorName: this._name,
      backendPoolsSettings: {
        enforceCertificateNameCheck: 'Enabled',
        sendRecvTimeoutSeconds: 60,
      },
    });
  }

  public build(): ResourceInfo {
    this.buildProfile();

    return {
      group: this.commonProps.group,
      name: this._name,
      id: this._profileInfo!.id,
    };
  }
}
