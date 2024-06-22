import * as native from "@pulumi/azure-native";
import { Input, all, Resource, output } from "@pulumi/pulumi";
import * as global from "../Common/GlobalEnv";
import { parseResourceInfoFromId } from "../Common/AzureEnv";
import {
  BasicResourceArgs,
  BasicResourceResultProps,
  ResourceGroupInfo,
  ResourceInfo,
} from "../types";

interface RecordProps {
  recordName: string;
  dnsInfo: ResourceInfo;
  ipAddresses: Input<string>[] | Input<string[]>;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}
export const addARecord = ({
  recordName,
  dnsInfo,
  ipAddresses,
  dependsOn,
}: RecordProps) => {
  recordName = recordName.replace("https://", "").replace("http://", "");
  //.replace(`.${zoneName}`, "");

  return new native.network.PrivateRecordSet(
    recordName === "*"
      ? "All-ARecord"
      : recordName === "@"
        ? "Root-ARecord"
        : `${recordName}-ARecord`,
    {
      privateZoneName: dnsInfo.resourceName,
      ...dnsInfo.group,
      relativeRecordSetName: recordName,
      recordType: "A",
      aRecords: output(ipAddresses).apply((ips) =>
        ips.map((i) => ({ ipv4Address: i })),
      ),
      ttl: 3600,
    },
    { dependsOn },
  );
};

interface VnetToPrivateDnsProps extends BasicResourceArgs {
  zoneName: Input<string>;
  vnetId: Input<string>;
  registrationEnabled?: boolean;
}

export const linkVnetToPrivateDns = ({
  name,
  group,
  zoneName,
  vnetId,
  registrationEnabled = false,
  ...others
}: VnetToPrivateDnsProps) => {
  return new native.network.VirtualNetworkLink(
    `${name}-link`,
    {
      ...group,
      location: "global",
      privateZoneName: zoneName,
      registrationEnabled,
      virtualNetwork: { id: vnetId },
    },
    others,
  );
};

interface Props {
  name: string;
  vnetIds?: Input<string>[];
  group?: ResourceGroupInfo;
  records?: {
    aRecords: Array<Pick<RecordProps, "recordName" | "ipAddresses">>;
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
}: Props): BasicResourceResultProps<native.network.PrivateZone> & {
  toDnsInfo: () => ResourceInfo;
} => {
  const zone = new native.network.PrivateZone(
    name,
    {
      privateZoneName: name,
      ...group,
      location: "global",
    },
    { dependsOn },
  );

  const toDnsInfo = () => ({ resourceName: name, group, id: zone.id });

  if (vnetIds) {
    vnetIds.map((id) =>
      linkVnetToPrivateDns({
        name,
        vnetId: id,
        zoneName: name,
        group,
        registrationEnabled: false,
        dependsOn: zone,
      }),
    );
  }

  if (records) {
    if (records.aRecords) {
      records.aRecords.map((a) =>
        addARecord({ ...a, dnsInfo: toDnsInfo(), dependsOn: zone }),
      );
    }
  }

  return {
    name,
    resource: zone,
    toDnsInfo,
  };
};

export const getPrivateZone = ({
  name,
  group = global.groupInfo,
}: Omit<Props, "vnetIds">) =>
  native.network.getPrivateZone({
    privateZoneName: name,
    resourceGroupName: group.resourceGroupName,
  });
