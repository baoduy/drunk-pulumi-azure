/* eslint-disable */
import { ClientCredential } from '../CustomProviders/Base';
import axios from 'axios';
import { urlJoin } from 'url-join-ts';
import { testMode } from '../Common/StackEnv';

export const createAxios = () => {
  const credentials = new ClientCredential();
  let token: string | undefined;
  let baseUrl: string | undefined;

  const axiosWrapper = axios.create();

  axiosWrapper.interceptors.request.use(async (config) => {
    if (!token) {
      const tokenRequest = await credentials.getToken();
      token = tokenRequest?.token;
      baseUrl = `https://management.azure.com/subscriptions/${credentials.subscriptionID!}`;
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

  axiosWrapper.interceptors.response.use(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (rs) => rs
    // (error) => {
    //   let final = error;

    //   if (error.response) {
    //     final = error.response.data;
    //   } else if (error.request) {
    //     final = error.request;
    //   } else {
    //     final = error.message;
    //   }
    //   throw new Error(final);
    // }
  );
  return axiosWrapper;
};
