/* eslint-disable */

import axios from 'axios';
import { urlJoin } from 'url-join-ts';
import { DefaultAzureCredential } from '@azure/identity';
import { subscriptionId } from '../Common/AzureEnv';

export const createAxios = () => {
  const credentials = new DefaultAzureCredential();
  let token: string | undefined;
  let baseUrl: string | undefined;

  const axiosWrapper = axios.create();

  axiosWrapper.interceptors.request.use(async (config) => {
    if (!token) {
      const tokenRequest = await credentials.getToken(
        'https://management.azure.com'
      );
      token = tokenRequest?.token;
      baseUrl = `https://management.azure.com/subscriptions/${subscriptionId}`;
    }

    if (!config.url || !config.url.startsWith('http')) {
      config.url = config.url!.includes('subscriptions')
        ? urlJoin('https://management.azure.com', config.url)
        : urlJoin(baseUrl, config.url);
    }

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  });

  // axiosWrapper.interceptors.response.use(
  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  //   (rs) => rs
  // );
  return axiosWrapper;
};
