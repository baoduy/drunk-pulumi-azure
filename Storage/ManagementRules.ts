import * as pulumi from "@pulumi/pulumi";
import * as storage from "@pulumi/azure-native/storage";
import { ResourceGroupInfo } from "../types";

interface DateAfterModificationArgs {
  /**
   * Value indicating the age in days after last blob access. This property can only be used in conjunction with last access time tracking policy
   */
  daysAfterLastAccessTimeGreaterThan?: pulumi.Input<number>;
  /**
   * Value indicating the age in days after last modification
   */
  daysAfterModificationGreaterThan?: pulumi.Input<number>;
}
interface DateAfterCreationArgs {
  /**
   * Value indicating the age in days after creation
   */
  daysAfterCreationGreaterThan: pulumi.Input<number>;
}
interface PolicyVersionArgs {
  /**
   * The function to delete the blob version
   */
  delete?: pulumi.Input<DateAfterCreationArgs>;
  /**
   * The function to tier blob version to archive storage. Support blob version currently at Hot or Cool tier
   */
  tierToArchive?: pulumi.Input<DateAfterCreationArgs>;
  /**
   * The function to tier blob version to cool storage. Support blob version currently at Hot tier
   */
  tierToCool?: pulumi.Input<DateAfterCreationArgs>;
}

export type ManagementRules = {
  actions: {
    baseBlob?: {
      delete?: DateAfterModificationArgs;
      tierToArchive?: DateAfterModificationArgs;
      tierToCool?: DateAfterModificationArgs;
      enableAutoTierToHotFromCool?: boolean;
    };
    snapshot?: PolicyVersionArgs;
    version?: PolicyVersionArgs;
  };
  filters?: {
    blobTypes: Array<"blockBlob" | "appendBlob">;
    tagFilters?: pulumi.Input<{
      name: pulumi.Input<string>;
      op: "==";
      value: pulumi.Input<string>;
    }>[];
  };
};

export const createManagementRules = ({
  name,
  storageAccountName,
  group,
  rules,
  containerNames,
}: {
  name: string;
  group: ResourceGroupInfo;
  storageAccountName: pulumi.Input<string>;
  containerNames?: pulumi.Input<string>[];
  rules: ManagementRules[];
}) => {
  name = `${name}-mnp`;
  return new storage.ManagementPolicy(name, {
    managementPolicyName: name,
    accountName: storageAccountName,
    ...group,
    policy: {
      rules: rules.map((m, i) => ({
        enabled: true,
        name: `${name}-${i}`,
        type: "Lifecycle",
        definition: {
          actions: m.actions,

          filters: m.filters
            ? {
                blobTypes: m.filters!.blobTypes,
                prefixMatch: containerNames,
                blobIndexMatch: m.filters!.tagFilters,
              }
            : undefined,
        },
      })),
    },
  });
};
