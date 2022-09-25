import * as native from '@pulumi/azure-native';

import { GetClientTokenArgs } from '@pulumi/azure-native/authorization';

export const getAzToken = async (args?: GetClientTokenArgs) => {
  const config = await native.authorization.getClientConfig();
  const token = await native.authorization.getClientToken();

  const rs = { config, token: token.token };
  //console.log('getAzToken', JSON.stringify(rs));
  return rs;
};
