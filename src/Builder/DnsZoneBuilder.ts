import { Builder, BuilderProps } from "./types";
import { ResourceInfo } from "../types";
import { DnsZoneARecordType, IDnsZoneBuilder } from "./types/dnsZoneBuilder";
import * as network from "@pulumi/azure-native/network";

class DnsZoneBuilder extends Builder<ResourceInfo> implements IDnsZoneBuilder {
  private _aRecords: DnsZoneARecordType[] = [];
  private _children: string[] = [];

  private _zoneInstance: network.Zone | undefined = undefined;
  private _childrenInstances: ResourceInfo[] | undefined = undefined;

  public constructor(props: BuilderProps) {
    super({
      ...props,
      group: {
        resourceGroupName: props.group.resourceGroupName,
        location: "global",
      },
    });
  }

  withSubZone(name: string): IDnsZoneBuilder {
    this._children.push(name);
    return this;
  }

  withARecord(props: DnsZoneARecordType): IDnsZoneBuilder {
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
        zoneType: network.ZoneType.Public,
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

  private buildChildren() {
    if (this._children.length <= 0) return;
    const { name, group, vaultInfo, envRoles } = this.commonProps;

    this._childrenInstances = this._children.map((c) => {
      const n = `${c}.${name}`;
      const builder = new DnsZoneBuilder({
        name: n,
        group,
        vaultInfo,
        envRoles,
        dependsOn: this._zoneInstance,
      });

      const rs = builder.build();
      const cc = builder.getZoneInstance()!;
      cc.nameServers.apply(
        (ns) =>
          new network.RecordSet(
            `${n}-NS`,
            {
              zoneName: this._zoneInstance!.name,
              ...group,
              relativeRecordSetName: cc!.name,
              recordType: "NS",
              nsRecords: ns.map((s) => ({ nsdname: s })),
              ttl: 3600,
            },
            { dependsOn: cc },
          ),
      );
      return rs;
    });
  }

  public build(): ResourceInfo {
    this.buildZone();
    this.buildChildren();

    return {
      resourceName: this.commonProps.name,
      group: this.commonProps.group,
      id: this._zoneInstance!.id,
    };
  }
}

export default (props: BuilderProps) =>
  new DnsZoneBuilder(props) as IDnsZoneBuilder;
