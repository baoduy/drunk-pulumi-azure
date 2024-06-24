export enum SetHeaderTypes {
  delete = "delete",
  override = "override",
  skip = "skip",
  append = "append",
}

export type ApimBaseUrlType = {
  url: string;
};
export type ApimSetHeaderType = {
  name: string;
  value?: string;
  type: SetHeaderTypes;
};
export type ApimCheckHeaderType = {
  name: string;
  value?: string[];
};
export type ApimMockPropsType = {
  code?: number;
  contentType?: string;
};
export type ApimRewriteUriType = {
  template?: string;
};
export type ApimRateLimitType = {
  /** Number of call */
  call?: number;
  /** in period (second) */
  period?: number;
  /** only applied to the success condition `@(context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)` */
  successConditionOnly?: boolean;
};
export type ApimOutCacheType = {
  duration?: number;
};
export type ApimAuthCertType = {
  thumbprint: string;
};
export type ApimClientCertType = Partial<ApimAuthCertType> & {
  issuer?: string;
  subject?: string;
  verifyCert?: boolean;
};
export type ApimCorsType = {
  origins?: string[];
};
export type ApimClientIpHeaderType = {
  /** ex: `x-${organization}-clientIp` */
  headerKey: string;
};
export type ApimValidateJwtWhitelistIpType = {
  claimKey: "client_IpWhitelist" | string;
};
export type ApimWhitelistIpType = {
  ipAddresses: string[];
};
export type ApimFindAndReplaceType = {
  from: string;
  to: string;
};
export type ApimCustomPolicyType = {
  policy: string;
};
export interface IApimPolicyBuilder {
  setBaseUrl(props: ApimBaseUrlType): IApimPolicyBuilder;
  setHeader(props: ApimSetHeaderType): IApimPolicyBuilder;
  checkHeader(props: ApimCheckHeaderType): IApimPolicyBuilder;
  mockResponse(props: ApimMockPropsType): IApimPolicyBuilder;
  rewriteUri(props: ApimRewriteUriType): IApimPolicyBuilder;
  setRateLimit(props: ApimRateLimitType): IApimPolicyBuilder;
  setCacheOptions(props: ApimOutCacheType): IApimPolicyBuilder;
  setBackendCert(props: ApimAuthCertType): IApimPolicyBuilder;
  verifyClientCert(props: ApimClientCertType): IApimPolicyBuilder;
  setCors(props: ApimCorsType): IApimPolicyBuilder;
  setClientIpHeader(props: ApimClientIpHeaderType): IApimPolicyBuilder;
  /** Filter IP from Bearer Token */
  validateJwtWhitelistIp(
    props: ApimValidateJwtWhitelistIpType,
  ): IApimPolicyBuilder;
  /** IP Address Whitelisting */
  setWhitelistIPs(props: ApimWhitelistIpType): IApimPolicyBuilder;
  /**Replace outbound results */
  setFindAndReplaces(props: ApimFindAndReplaceType): IApimPolicyBuilder;

  //Custom Policies
  withInboundPolicy(props: ApimCustomPolicyType): IApimPolicyBuilder;
  withOutPolicy(props: ApimCustomPolicyType): IApimPolicyBuilder;

  build(): string;
}
