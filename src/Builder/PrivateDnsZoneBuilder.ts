import { DnsZoneARecordType } from "./types";
import { BasicResourceArgs, ResourceInfo } from "../types";
import * as network from "@pulumi/azure-native/network";
import {
  IPrivateDnsZoneBuilder,
  PrivateDnsZoneVnetLinkingType,
} from "./types/privateDnsZoneBuilder";
import * as native from "@pulumi/azure-native";
import { output } from "@pulumi/pulumi";
import { getVnetIdFromSubnetId } from "../VNet/Helper";

class PrivateDnsZoneBuilder implements IPrivateDnsZoneBuilder {
  private _aRecords: DnsZoneARecordType[] = [];
  private _vnetLinks: PrivateDnsZoneVnetLinkingType[] = [];

  private _zoneInstance: network.PrivateZone | undefined = undefined;

  public constructor(private commonProps: BasicResourceArgs) {}

  linkTo(props: PrivateDnsZoneVnetLinkingType): IPrivateDnsZoneBuilder {
    this._vnetLinks.push(props);
    return this;
  }

  withARecord(props: DnsZoneARecordType): IPrivateDnsZoneBuilder {
    this._aRecords.push(props);
    return this;
  }

  private buildZone() {
    const { name, group, dependsOn } = this.commonProps;
    this._zoneInstance = new network.PrivateZone(
      name,
      {
        privateZoneName: name,
        ...group,
      },
      { dependsOn },
    );

    if (this._aRecords) {
      this._aRecords.forEach(
        (a) =>
          new network.PrivateRecordSet(
            a.recordName === "*"
              ? "All-ARecord"
              : a.recordName === "@"
                ? "Root-ARecord"
                : `${a.recordName}-ARecord`,
            {
              privateZoneName: this._zoneInstance!.name,
              ...group,
              relativeRecordSetName: a.recordName,
              recordType: "A",
              aRecords: output(a.ipAddresses).apply((ip) =>
                ip.map((i) => ({ ipv4Address: i })),
              ),
              ttl: 3600,
            },
          ),
      );
    }
  }

  private buildVnetLinks() {
    if (this._vnetLinks.length <= 0) return;
    this._vnetLinks.forEach((lik, index) =>
      [
        ...(lik.vnetIds ?? []),
        ...(lik.subnetIds ?? []).map((s) =>
          output(s).apply(getVnetIdFromSubnetId),
        ),
      ].map(
        (v) =>
          new native.network.VirtualNetworkLink(
            `${this.commonProps.name}-${index}-link`,
            {
              ...this.commonProps.group,
              privateZoneName: this._zoneInstance!.name,
              registrationEnabled: lik.registrationEnabled,
              virtualNetwork: { id: v },
            },
            { dependsOn: this._zoneInstance },
          ),
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

export default (props: BasicResourceArgs) =>
  new PrivateDnsZoneBuilder(props) as IPrivateDnsZoneBuilder;
