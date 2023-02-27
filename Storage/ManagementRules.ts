import * as pulumi from '@pulumi/pulumi';
import * as storage from '@pulumi/azure-native/storage';
import { ResourceGroupInfo } from '../types';

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

type ManagementRuleActions = {
  baseBlob?: {
    delete?: DateAfterModificationArgs;
    tierToArchive?: DateAfterModificationArgs;
    tierToCool?: DateAfterModificationArgs;
    enableAutoTierToHotFromCool?: boolean;
  };
  snapshot?: PolicyVersionArgs;
  version?: PolicyVersionArgs;
};

type ManagementRuleFilters = {
  blobTypes: Array<'blockBlob' | 'appendBlob'>;
  tagFilters?: pulumi.Input<{
    name: pulumi.Input<string>;
    op: '==';
    value: pulumi.Input<string>;
  }>[];
};

interface DefaultManagementRuleFilters extends ManagementRuleFilters {
  containerNames?: pulumi.Input<string>[];
}

export type DefaultManagementRules = {
  actions: ManagementRuleActions;
  filters?: DefaultManagementRuleFilters;
};

export type ManagementRules = {
  actions: ManagementRuleActions;
  filters?: ManagementRuleFilters;
};

export const createManagementRules = ({
  name,
  storageAccount,
  group,
  rules,
  containerNames,
}: {
  name: string;
  group: ResourceGroupInfo;
  storageAccount: storage.StorageAccount;
  containerNames?: pulumi.Input<string>[];
  rules: Array<ManagementRules | DefaultManagementRules>;
}) => {
  name = `${name}-mnp`;
  return new storage.v20220501.ManagementPolicy(
    name,
    {
      managementPolicyName: name,
      accountName: storageAccount.name,
      ...group,

      policy: {
        rules: rules.map((m, i) => ({
          enabled: true,
          name: `${name}-${i}`,
          type: 'Lifecycle',
          definition: {
            actions: m.actions,

            filters: m.filters
              ? {
                  blobTypes: m.filters.blobTypes,
                  prefixMatch:
                    containerNames ??
                    (m.filters as DefaultManagementRuleFilters).containerNames,
                  blobIndexMatch: m.filters.tagFilters,
                }
              : undefined,
          },
        })),
      },
    },
    { dependsOn: storageAccount }
  );
};
