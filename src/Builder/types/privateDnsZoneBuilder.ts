import { Input } from '@pulumi/pulumi';
import { IBuilder } from './genericBuilder';
import { ResourceInfo } from '../../types';
import { DnsZoneARecordType } from './dnsZoneBuilder';

export type PrivateDnsZoneVnetLinkingType = {
  vnetIds?: Input<string>[];
  //The vnetId will be calculated based on subnetId
  subnetIds?: Input<string>[];
  //registrationEnabled?: boolean;
};

export interface IPrivateDnsZoneBuilder {
  withARecord(props: DnsZoneARecordType): IPrivateDnsZoneBuilder;
  linkTo(props: PrivateDnsZoneVnetLinkingType): IPrivateDnsZoneBuilder;
  build(): ResourceInfo;
}
