import { Input } from '@pulumi/pulumi';
import { ResourceArgs, ResourceInfo, WithDependsOn } from '../../types';
import { DnsZoneARecordType } from './dnsZoneBuilder';

export type PrivateDnsZoneBuilderArgs = ResourceArgs & WithDependsOn;
/**
 * Type for defining the virtual network linking properties for a private DNS zone.
 */
export type PrivateDnsZoneVnetLinkingType = {
  /**
   * List of virtual network IDs to link to the private DNS zone.
   */
  vnetIds?: Input<string>[];
  /**
   * List of subnet IDs to link to the private DNS zone. The vnetId will be calculated based on subnetId.
   */
  subnetIds?: Input<string>[];
  // registrationEnabled?: boolean;
};

/**
 * Interface for building a private DNS zone.
 */
export interface IPrivateDnsZoneBuilder {
  /**
   * Adds an A record to the private DNS zone.
   * @param props - The properties of the A record.
   * @returns An instance of IPrivateDnsZoneBuilder.
   */
  withARecord(props: DnsZoneARecordType): IPrivateDnsZoneBuilder;

  /**
   * Links the private DNS zone to virtual networks.
   * @param props - The linking properties.
   * @returns An instance of IPrivateDnsZoneBuilder.
   */
  linkTo(props: PrivateDnsZoneVnetLinkingType): IPrivateDnsZoneBuilder;

  /**
   * Builds the private DNS zone and returns the resource information.
   * @returns The resource information of the built private DNS zone.
   */
  build(): ResourceInfo;
}
