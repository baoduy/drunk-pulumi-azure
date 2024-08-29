import * as pulumi from '@pulumi/pulumi';
import * as storage from '@pulumi/azure-native/storage';
import { ResourceArgs, WithDependsOn } from '../types';

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

/**This rule will be applied to an specific container*/
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
  dependsOn,
}: ResourceArgs &
  WithDependsOn & {
    storageAccount: storage.StorageAccount;
    containerNames?: pulumi.Input<string>[];
    rules: Array<ManagementRules>;
  }) => {
  name = `${name}-mnp`;
  return new storage.ManagementPolicy(
    name,
    {
      ...group,
      managementPolicyName: 'default',
      accountName: storageAccount.name,

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
                  prefixMatch: containerNames,
                  blobIndexMatch: m.filters.tagFilters,
                }
              : undefined,
          },
        })),
      },
    },
    { dependsOn: dependsOn ?? storageAccount },
  );
};
