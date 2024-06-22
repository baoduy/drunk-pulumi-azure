import { Input } from "@pulumi/pulumi";
import { ResourceInfo } from "../../types";

export type DnsZoneARecordType = {
  recordName: string;
  ipAddresses: Input<string>[];
};

export interface IDnsZoneBuilder {
  withARecord(props: DnsZoneARecordType): IDnsZoneBuilder;
  withSubZone(name: string): IDnsZoneBuilder;
  build(): ResourceInfo;
}
