import { DnsZoneARecordType } from './types';
import { BasicResourceArgs, ResourceInfo } from '../types';
import * as network from '@pulumi/azure-native/network';
import {
  IPrivateDnsZoneBuilder,
  PrivateDnsZoneVnetLinkingType,
} from './types/privateDnsZoneBuilder';
import * as native from '@pulumi/azure-native';
import { output } from '@pulumi/pulumi';
import { getVnetIdFromSubnetId, globalKeyName } from '../Common';

class PrivateDnsZoneBuilder implements IPrivateDnsZoneBuilder {
  private _aRecords: DnsZoneARecordType[] = [];
  private _vnetLinks: PrivateDnsZoneVnetLinkingType[] = [];
  private readonly commonProps: BasicResourceArgs;

  private _dnsInfo: ResourceInfo | undefined = undefined;
  private _zoneInstance: network.PrivateZone | undefined = undefined;

  public constructor(props: BasicResourceArgs) {
    if ('id' in props) this._dnsInfo = props as ResourceInfo;
    this.commonProps = {
      ...props,
      group: {
        resourceGroupName: props.group.resourceGroupName,
        location: globalKeyName,
      },
    };
  }

  public static from(info: ResourceInfo): PrivateDnsZoneBuilder {
    return new PrivateDnsZoneBuilder(info);
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
    if (this._dnsInfo) return;
    const { name, group, dependsOn } = this.commonProps;
    this._zoneInstance = new network.PrivateZone(
      name,
      {
        privateZoneName: name,
        ...group,
      },
      { dependsOn },
    );

    this._dnsInfo = {
      name: this.commonProps.name,
      group: this.commonProps.group,
      id: this._zoneInstance!.id,
    };
  }

  private buildRecords() {
    this._aRecords.forEach((a, index) => {
      const n =
        a.recordName === '*'
          ? `All-${index}-ARecord`
          : a.recordName === '@'
            ? `Root-${index}-ARecord`
            : `${a.recordName}-ARecord`;

      return new network.PrivateRecordSet(
        `${this._dnsInfo!.name}-${n}`,
        {
          privateZoneName: this._dnsInfo!.name,
          ...this._dnsInfo!.group,
          relativeRecordSetName: a.recordName,
          recordType: 'A',
          aRecords: a.ipAddresses.map((i) => ({ ipv4Address: i })),
          ttl: 3600,
        },
        { dependsOn: this._zoneInstance, deleteBeforeReplace: true },
      );
    });
  }

  private buildVnetLinks() {
    if (this._vnetLinks.length <= 0) return;
    this._vnetLinks.forEach((lik, index) =>
      [
        //Link all subnets first
        ...(lik.subnetIds ?? []).map((s) =>
          output(s).apply((i) => getVnetIdFromSubnetId(i)),
        ),
        //Then link the extra Vnet
        ...(lik.vnetIds ?? []),
      ].map((v, i) => {
        return new native.network.VirtualNetworkLink(
          `${this.commonProps.name.split('.')[0]}-${index}-${i}-link`,
          {
            privateZoneName: this._dnsInfo!.name,
            ...this._dnsInfo!.group,
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
    this.buildRecords();
    this.buildVnetLinks();

    return this._dnsInfo!;
  }
}

export const from = (info: ResourceInfo) =>
  PrivateDnsZoneBuilder.from(info) as IPrivateDnsZoneBuilder;

export default (props: BasicResourceArgs) =>
  new PrivateDnsZoneBuilder(props) as IPrivateDnsZoneBuilder;
