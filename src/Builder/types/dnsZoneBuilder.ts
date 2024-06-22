import { Input } from "@pulumi/pulumi";
import { IBuilder } from "./genericBuilder";
import { ResourceInfo } from "../../types";

export type DnsZoneARecordType = {
  recordName: string;
  ipAddresses: Input<string>[];
};

export interface IDnsZoneBuilder extends IBuilder<ResourceInfo> {
  withARecord(props: DnsZoneARecordType): IDnsZoneBuilder;
  withSubZone(name: string): IDnsZoneBuilder;
}
