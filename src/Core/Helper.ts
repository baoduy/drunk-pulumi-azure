import {createAxios} from '@drunk-pulumi/azure-providers/Tools/Axios';

export interface AzureResourceItem {
  id: string;
  name: string;
  location: string;
  resourceGroupName: string;
  tags: {
    [key: string]: string;
  };
}

export interface AzureResourceResult {
  value: Array<AzureResourceItem>;
}

/** Find a NetworkSecurityGroups in a Resource Group*/
export const findNetworkSecurityGroups = async (group: string) => {
  const axios = createAxios();
  try {
    const url = `/resourceGroups/${group}/providers/Microsoft.Network/networkSecurityGroups?api-version=2020-05-01`;
    const rs = await axios.get<AzureResourceResult>(url).then((rs) => rs.data);

    return rs.value.map((i) => {
      i.resourceGroupName = group;
      return i;
    });
  } catch (error) {
    return undefined;
  }
};

/** Find VM Scale set in a Resource Group */
export const findVMScaleSet = async (group: string) => {
  const axios = createAxios();
  try {
    const url = `/resourceGroups/${group}/providers/Microsoft.Compute/virtualMachineScaleSets?api-version=2020-06-01`;
    const rs = await axios.get<AzureResourceResult>(url).then((rs) => rs.data);

    return rs.value.map((i) => {
      i.resourceGroupName = group;
      return i;
    });
  } catch (error) {
    return undefined;
  }
};
