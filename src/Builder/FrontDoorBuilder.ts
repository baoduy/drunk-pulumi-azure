import { ResourceInfo } from '../types';
import * as frontdoor from '@pulumi/azure-native/frontdoor';
import { naming } from '../Common';
import { Builder, BuilderProps } from './types';
import {
  IFrontDoorBuilder,
  FrontDoorBuilderEndpointType,
} from './types/frontDoorBuilder';

/**
 * FrontDoorBuilder class for creating and configuring Azure Front Door (classic) resources.
 * This class implements the Builder pattern for Front Door configuration including
 * profiles and endpoints.
 * @extends Builder<ResourceInfo>
 * @implements IFrontDoorBuilder
 */
export class FrontDoorBuilder
  extends Builder<ResourceInfo>
  implements IFrontDoorBuilder
{
  private _name: string;
  
  // Resource instances
  private _profileInfo: frontdoor.FrontDoor | undefined;
  
  // Configuration properties
  private _endpoints: FrontDoorBuilderEndpointType[] = [];

  /**
   * Creates an instance of FrontDoorBuilder.
   * @param {BuilderProps} props - The arguments for building the Front Door.
   */
  public constructor(props: BuilderProps) {
    super(props);
    this._name = naming.getCdnEndpointName(props.name);
  }

  /**
   * Adds an endpoint configuration to the Front Door.
   * @param {FrontDoorBuilderEndpointType} props - The endpoint configuration to add.
   * @returns {IFrontDoorBuilder} The current FrontDoorBuilder instance.
   */
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
