import { Builder, BuilderProps, DnsZoneARecordType } from "./types";
import { ResourceInfo } from "../types";
import * as network from "@pulumi/azure-native/network";
import {
  IPrivateDnsZoneBuilder,
  PrivateDnsZoneVnetLinkingType,
} from "./types/privateDnsZoneBuilder";
import * as native from "@pulumi/azure-native";

class PrivateDnsZoneBuilder
  extends Builder<ResourceInfo>
  implements IPrivateDnsZoneBuilder
{
  private _aRecords: DnsZoneARecordType[] = [];
  private _vnetLinks: PrivateDnsZoneVnetLinkingType[] = [];

  private _zoneInstance: network.Zone | undefined = undefined;

  public constructor(props: BuilderProps) {
    super({
      ...props,
      group: {
        resourceGroupName: props.group.resourceGroupName,
        location: "global",
      },
    });
  }

  linkTo(props: PrivateDnsZoneVnetLinkingType): IPrivateDnsZoneBuilder {
    this._vnetLinks.push(props);
    return this;
  }

  withARecord(props: DnsZoneARecordType): IPrivateDnsZoneBuilder {
    this._aRecords.push(props);
    return this;
  }

  private getZoneInstance() {
    return this._zoneInstance;
  }

  private buildZone() {
    const { name, group, dependsOn } = this.commonProps;
    this._zoneInstance = new network.Zone(
      name,
      {
        zoneName: name,
        zoneType: network.ZoneType.Private,
        ...group,
      },
      { dependsOn },
    );

    if (this._aRecords) {
      this._aRecords.forEach(
        (a) =>
          new network.RecordSet(
            a.recordName === "*"
              ? "All-ARecord"
              : a.recordName === "@"
                ? "Root-ARecord"
                : `${a.recordName}-ARecord`,
            {
              zoneName: this._zoneInstance!.name,
              ...group,
              relativeRecordSetName: a.recordName,
              recordType: "A",
              aRecords: a.ipAddresses.map((i) => ({ ipv4Address: i })),
              ttl: 3600,
            },
          ),
      );
    }
  }

  private buildVnetLinks() {
    if (this._vnetLinks.length <= 0) return;
    this._vnetLinks.map(
      (lik, index) =>
        new native.network.VirtualNetworkLink(
          `${this.commonProps.name}-${index}-link`,
          {
            ...this.commonProps.group,
            privateZoneName: this._zoneInstance!.name,
            registrationEnabled: lik.registrationEnabled,
            virtualNetwork: { id: lik.vnetId },
          },
          { dependsOn: this._zoneInstance },
        ),
    );
  }

  public build(): ResourceInfo {
    this.buildZone();
    this.buildVnetLinks();

    return {
      resourceName: this.commonProps.name,
      group: this.commonProps.group,
      id: this._zoneInstance!.id,
    };
  }
}

export default (props: BuilderProps) =>
  new PrivateDnsZoneBuilder(props) as IPrivateDnsZoneBuilder;
