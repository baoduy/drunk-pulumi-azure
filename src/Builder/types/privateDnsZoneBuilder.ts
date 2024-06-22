import { Input } from "@pulumi/pulumi";
import { IBuilder } from "./genericBuilder";
import { ResourceInfo } from "../../types";
import { DnsZoneARecordType } from "./dnsZoneBuilder";

export type PrivateDnsZoneVnetLinkingType = {
  vnetId: Input<string>;
  registrationEnabled?: boolean;
};

export interface IPrivateDnsZoneBuilder extends IBuilder<ResourceInfo> {
  withARecord(props: DnsZoneARecordType): IPrivateDnsZoneBuilder;
  linkTo(props: PrivateDnsZoneVnetLinkingType): IPrivateDnsZoneBuilder;
}
