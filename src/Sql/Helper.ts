import { naming } from '../Common';

export const getSqlServerInfo = ({
  name,
  groupName,
}: {
  name: string;
  groupName: string;
}) => {
  const group = naming.getResourceGroupName(groupName);
  const sqlServerName = naming.getSqlServerName(name);

  return { name: sqlServerName, group: { resourceGroupName: group } };
};
