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
import { globalKeyName } from "../Common/GlobalEnv";

class PrivateDnsZoneBuilder implements IPrivateDnsZoneBuilder {
  private _aRecords: DnsZoneARecordType[] = [];
  private _vnetLinks: PrivateDnsZoneVnetLinkingType[] = [];
  private readonly commonProps: BasicResourceArgs;

  private _zoneInstance: network.PrivateZone | undefined = undefined;

  public constructor({ group, ...others }: BasicResourceArgs) {
    this.commonProps = {
      ...others,
      group: {
        resourceGroupName: group.resourceGroupName,
        location: globalKeyName,
      },
    };
  }

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

    this._aRecords.forEach(
      (a, index) =>
        new network.PrivateRecordSet(
          a.recordName === "*"
            ? `All-${index}-ARecord`
            : a.recordName === "@"
              ? `Root-${index}-ARecord`
              : `${a.recordName}-ARecord`,
          {
            privateZoneName: this._zoneInstance!.name,
            ...group,
            relativeRecordSetName: a.recordName,
            recordType: "A",
            aRecords: a.ipAddresses.map((i) => ({ ipv4Address: i })),
            ttl: 3600,
          },
          { dependsOn: this._zoneInstance, deleteBeforeReplace: true },
        ),
    );
  }

  private buildVnetLinks() {
    if (this._vnetLinks.length <= 0) return;
    this._vnetLinks.forEach((lik, index) =>
      [
        ...(lik.vnetIds ?? []),
        ...(lik.subnetIds ?? []).map((s) =>
          output(s).apply((i) => getVnetIdFromSubnetId(i)),
        ),
      ].map((v, i) => {
        //output(v).apply((i) => console.log(this.commonProps.name, i));

        return new native.network.VirtualNetworkLink(
          `${this.commonProps.name.split(".")[0]}-${index}-${i}-link`,
          {
            ...this.commonProps.group,
            privateZoneName: this._zoneInstance!.name,
            registrationEnabled: Boolean(lik.registrationEnabled),
            virtualNetwork: { id: v },
          },
          { dependsOn: this._zoneInstance, deleteBeforeReplace: true },
        );
      }),
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
