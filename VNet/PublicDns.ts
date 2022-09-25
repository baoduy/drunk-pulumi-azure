import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';
import { global } from '../Common';
import { globalKeyName } from '../Common/config';

interface RecordProps {
  zoneName: Input<string>;
  recordName: string;
  ipAddresses: string[];
}

export const addARecord = ({
  zoneName,
  recordName,
  ipAddresses,
}: RecordProps) =>
  new network.RecordSet(
    recordName === '*'
      ? 'All-ARecord'
      : recordName === '@'
      ? 'Root-ARecord'
      : `${recordName}-ARecord`,
    {
      zoneName,
      ...global.groupInfo,
      relativeRecordSetName: recordName,
      recordType: 'A',
      aRecords: ipAddresses.map((i) => ({ ipv4Address: i })),
      ttl: 3600,
    }
  );

interface ZoneProps {
  name: string;
  defaultIpAddress?: string;
}

/** Create Private DNS zone. This should be created in the GLobal resource group. */
const zoneCreator = ({ name, defaultIpAddress }: Props) => {
  const zone = new network.Zone(name, {
    zoneName: name,
    zoneType: network.ZoneType.Public,
    location: globalKeyName,
    ...global.groupInfo,
  });

  if (defaultIpAddress) {
    addARecord({
      ipAddresses: [defaultIpAddress],
      zoneName: name,
      recordName: '@',
    });
  }

  return zone;
};

interface Props extends ZoneProps {
  name: string;
  childZones?: Array<ZoneProps>;
}

/** Create Private DNS zone. This should be created in the GLobal resource group. */
export default ({ name, defaultIpAddress, childZones }: Props) => {
  const zone = zoneCreator({ name, defaultIpAddress });

  let child: Array<network.Zone> | undefined = undefined;
  if (childZones) {
    child = childZones.map((z) => {
      const c = zoneCreator({ ...z, name: `${z.name}.${name}` });

      c.nameServers.apply((ns) => {
        //Add NS and Other Record to the Parent Zone
        new network.RecordSet(
          `${z.name}.${name}-NS`,
          {
            zoneName: zone.name,
            ...global.groupInfo,
            relativeRecordSetName: z.name,
            recordType: 'NS',
            nsRecords: ns.map((s) => ({ nsdname: s })),
            ttl: 3600,
          },
          { dependsOn: c }
        );
      });

      return c;
    });
  }

  return { zone, child };
};
