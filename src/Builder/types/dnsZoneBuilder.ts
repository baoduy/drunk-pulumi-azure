import { Input, Output } from '@pulumi/pulumi';
import { ResourceArgs, ResourceInfo, WithDependsOn } from '../../types';
import { IBuilder } from './genericBuilder';

export type DnsZoneBuilderArgs = ResourceArgs &
  WithDependsOn & { id?: Output<string> };
/**
 * Properties for configuring a DNS Zone A record.
 */
export type DnsZoneARecordType = {
  recordName: string;
  ipAddresses: Input<string>[];
};

/**
 * Interface for building a DNS Zone.
 */
export interface IDnsZoneBuilder extends IBuilder<ResourceInfo> {
  /**
   * Method to add an A record to the DNS Zone.
   * @param props - Properties for the A record.
   * @returns An instance of IDnsZoneBuilder.
   */
  withARecord(props: DnsZoneARecordType): IDnsZoneBuilder;

  /**
   * Method to add a sub-zone to the DNS Zone.
   * @param name - The name of the sub-zone.
   * @returns An instance of IDnsZoneBuilder.
   */
  withSubZone(name: string): IDnsZoneBuilder;
}
