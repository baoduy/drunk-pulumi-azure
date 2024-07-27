import * as pulumi from '@pulumi/pulumi';
import * as storage from '@pulumi/azure-native/storage';
import { ResourceArgs } from '../types';

interface DateAfterModificationArgs {
  daysAfterLastAccessTimeGreaterThan?: pulumi.Input<number>;
  daysAfterModificationGreaterThan?: pulumi.Input<number>;
}
interface DateAfterCreationArgs {
  daysAfterCreationGreaterThan: pulumi.Input<number>;
}
interface PolicyVersionArgs {
  delete?: pulumi.Input<DateAfterCreationArgs>;
  tierToArchive?: pulumi.Input<DateAfterCreationArgs>;
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
}: ResourceArgs & {
  storageAccount: storage.StorageAccount;
  containerNames?: pulumi.Input<string>[];
  rules: Array<ManagementRules | DefaultManagementRules>;
}) => {
  name = `${name}-mnp`;
  return new storage.ManagementPolicy(
    name,
    {
      managementPolicyName: 'default',
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
    { dependsOn: storageAccount },
  );
};
