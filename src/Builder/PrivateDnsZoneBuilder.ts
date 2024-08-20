import { DnsZoneARecordType } from './types';
import { BasicResourceArgs, ResourceInfo } from '../types';
import * as network from '@pulumi/azure-native/network';
import { IPrivateDnsZoneBuilder, PrivateDnsZoneVnetLinkingType } from './types';
import * as native from '@pulumi/azure-native';
import { output } from '@pulumi/pulumi';
import { rsInfo } from '../Common';
import { getAksPrivateDnsZone } from '../Aks/Helper';

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
        location: 'global',
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
    this._aRecords.forEach((a) => {
      const n =
        a.recordName === '*'
          ? `All-ARecord`
          : a.recordName === '@'
            ? `Root-ARecord`
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
    if (this._vnetLinks.length <= 0 || !this._dnsInfo) return;

    const linkName = rsInfo.getNameFromId(this._dnsInfo.name);
    const vnetIds = this._vnetLinks.flatMap((lik) => [
      //Link all subnets first
      ...(lik.subnetIds ?? []).map((s) =>
        output(s).apply((i) => rsInfo.getVnetIdFromSubnetId(i)),
      ),
      //Then link the extra Vnet
      ...(lik.vnetIds ?? []),
    ]);

    output(vnetIds).apply((vids) =>
      vids.map((v) => {
        const n = rsInfo.getNameFromId(v);
        return new native.network.VirtualNetworkLink(
          `${linkName}-${n}-link`,
          {
            ...this._dnsInfo!.group,
            privateZoneName: this._dnsInfo!.name,
            registrationEnabled: false,
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

export const from = (dnsZoneInfo: ResourceInfo) =>
  PrivateDnsZoneBuilder.from(dnsZoneInfo) as IPrivateDnsZoneBuilder;

export const fromPrivateAks = async (
  aks: ResourceInfo,
): Promise<IPrivateDnsZoneBuilder | undefined> => {
  const dns = await getAksPrivateDnsZone(aks);
  return dns ? from(dns) : undefined;
};

export default (props: BasicResourceArgs) =>
  new PrivateDnsZoneBuilder(props) as IPrivateDnsZoneBuilder;
