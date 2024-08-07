import CdnEndpoint from '../Cdn/CdnEndpoint';
import Cdn from '../Cdn';
import { ResourceInfo } from '../types';
import {
  Builder,
  BuilderProps,
  CdnBuilderEndpointType,
  ICdnBuilder,
} from './types';

export class CdnBuilder extends Builder<ResourceInfo> implements ICdnBuilder {
  private _profileInfo: ResourceInfo | undefined;
  private _endpoints: CdnBuilderEndpointType[] = [];

  public constructor(props: BuilderProps) {
    super(props);
  }

  public withEndpoint(props: CdnBuilderEndpointType): ICdnBuilder {
    this._endpoints.push(props);
    return this;
  }

  private buildProfile() {
    this._profileInfo = Cdn({
      ...this.commonProps,
    });
  }

  private buildEndpoints() {
    this._endpoints.map((entry) =>
      CdnEndpoint({
        ...entry,
        cdnProfileInfo: this._profileInfo!,
      }),
    );
  }
  public build(): ResourceInfo {
    this.buildProfile();
    this.buildEndpoints();

    return this._profileInfo!;
  }
}

export default (props: BuilderProps) => new CdnBuilder(props) as ICdnBuilder;
