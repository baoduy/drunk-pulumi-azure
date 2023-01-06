import { InternalCredentials } from "../CustomProviders/Base/Credentials";
import axios, { AxiosRequestHeaders } from "axios";
import { urlJoin } from "url-join-ts";

export const createAxios = () => {
  const credentials = new InternalCredentials();
  let token: string | undefined;
  let baseUrl: string | undefined;

  const axiosWrapper = axios.create({
    baseURL: "",
  });

  axiosWrapper.interceptors.request.use(async (config) => {
    if (!token) {
      const tokenRequest = await credentials.getCredentials();
      token = (await tokenRequest.getToken()).accessToken;
      baseUrl = `https://management.azure.com/subscriptions/${credentials.subscriptionID}`;
    }

    if (!config.url || !config.url.startsWith("http")) {
      config.url = config.url!.includes("subscriptions")
        ? urlJoin("https://management.azure.com", config.url!)
        : urlJoin(baseUrl!, config.url!);
    }

    if (!config.headers)
      config.headers = { Authorization: token ? `Bearer ${token}` : "" };
    else
      (config.headers as AxiosRequestHeaders).set(
        "Authorization",
        token ? `Bearer ${token}` : ""
      );

    return config;
  });

  return axiosWrapper;
};
