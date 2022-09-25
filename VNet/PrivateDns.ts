import * as native from '@pulumi/azure-native';
import { Input, all, Resource, output } from '@pulumi/pulumi';
import * as global from '../Common/GlobalEnv';
import { globalKeyName } from '../Common/config';
import { getResourceInfoFromId } from '../Common/ResourceEnv';
import { ResourceGroupInfo } from '../types';

interface RecordProps {
  zoneName: Input<string>;
  /**Default is Global Resource Group*/
  group?: ResourceGroupInfo;
  recordName: string;
  ipAddresses: Input<string[]>;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}
export const addARecord = ({
  zoneName,
  group = global.groupInfo,
  recordName,
  ipAddresses,
  dependsOn,
}: RecordProps) => {
  recordName = recordName
    .replace("https://","")
    .replace("http://","")
    .replace(`.${zoneName}`,'');

  return new native.network.PrivateRecordSet(
    recordName === '*'
      ? 'All-ARecord'
      : recordName === '@'
        ? 'Root-ARecord'
        : `${recordName}-ARecord`,
    {
      privateZoneName: zoneName,
      ...group,
      relativeRecordSetName: recordName,
      recordType: 'A',
      aRecords: output(ipAddresses).apply((ips) =>
        ips.map((i) => ({ ipv4Address: i }))
      ),
      ttl: 3600,
    },
    { dependsOn }
  );
}

interface VnetToPrivateDnsProps {
  zoneName: string;
  vnetId: string;
  registrationEnabled?: boolean;
  group?: ResourceGroupInfo;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export const linkVnetToPrivateDns = ({
  zoneName,
  group = global.groupInfo,
  vnetId,
  registrationEnabled,
  dependsOn,
}: VnetToPrivateDnsProps) => {
  const vnetInfo = getResourceInfoFromId(vnetId);

  return new native.network.VirtualNetworkLink(
    `${zoneName}-link-${vnetInfo!.name}`,
    {
      ...group,
      location: globalKeyName,
      privateZoneName: zoneName,
      registrationEnabled: registrationEnabled || false,
      virtualNetwork: { id: vnetId },
    },
    { dependsOn }
  );
};

interface Props {
  name: string;
  vnetIds?: Input<string>[];
  group?: ResourceGroupInfo;
  records?: {
    aRecords: Array<Pick<RecordProps, 'recordName' | 'ipAddresses'>>;
  };
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

/** Create Private DNS zone. This should be created in the Global resource group. */
export default ({
  name,
  group = global.groupInfo,
  vnetIds,
  records,
  dependsOn,
}: Props) => {
  const zone = new native.network.PrivateZone(
    name,
    {
      privateZoneName: name,
      ...group,
      location: 'global',
    },
    { dependsOn }
  );

  if (vnetIds) {
    all(vnetIds).apply((vn) =>
      vn.map((id) =>
        linkVnetToPrivateDns({
          vnetId: id,
          zoneName: name,
          group,
          registrationEnabled: false,
          dependsOn: zone,
        })
      )
    );
  }

  if (records) {
    if (records.aRecords) {
      records.aRecords.map((a) =>
        addARecord({ ...a, group, zoneName: zone.name, dependsOn: zone })
      );
    }
  }

  return zone;
};

export const getPrivateZone = ({
  name,
  group = global.groupInfo,
}: Omit<Props, 'vnetIds'>) =>
  native.network.getPrivateZone({
    privateZoneName: name,
    resourceGroupName: group.resourceGroupName,
  });
