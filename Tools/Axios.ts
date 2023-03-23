import { InternalCredentials } from '../CustomProviders/Base';
import axios from 'axios';
import { urlJoin } from 'url-join-ts';

export const createAxios = () => {
  const credentials = new InternalCredentials();
  let token: string | undefined;
  let baseUrl: string | undefined;

  const axiosWrapper = axios.create({
    baseURL: '',
  });

  axiosWrapper.interceptors.request.use(async (config) => {
    if (!token) {
      const tokenRequest = await credentials.getCredentials();
      token = (await tokenRequest.getToken()).accessToken;
      baseUrl = `https://management.azure.com/subscriptions/${credentials.subscriptionID!}`;
    }

    if (!config.url || !config.url.startsWith('http')) {
      config.url = config.url!.includes('subscriptions')
        ? urlJoin('https://management.azure.com', config.url)
        : urlJoin(baseUrl, config.url);
    }

    if (token) {
      config.headers.set('Authorization', token);
    }

    return config;
  });

  axiosWrapper.interceptors.response.use(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (rs) => rs,
    (error) => {
      // whatever you want to do with the error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw error.response?.data || error;
    }
  );
  return axiosWrapper;
};
