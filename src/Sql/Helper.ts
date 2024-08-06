import { getResourceGroupName, getSqlServerName } from '../Common';

export const getSqlServerInfo = ({
  name,
  groupName,
}: {
  name: string;
  groupName: string;
}) => {
  const group = getResourceGroupName(groupName);
  const sqlServerName = getSqlServerName(name);

  return { name: sqlServerName, group: { resourceGroupName: group } };
};
