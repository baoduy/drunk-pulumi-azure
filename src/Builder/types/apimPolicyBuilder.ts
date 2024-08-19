import { WithNamedType } from '../../types';

/**
 * Enum for different types of header operations.
 */
export enum SetHeaderTypes {
  delete = 'delete',
  override = 'override',
  skip = 'skip',
  append = 'append',
}

/**
 * Type for base URL configuration.
 */
export type ApimBaseUrlType = {
  url: string;
};

/**
 * Type for setting headers, extends WithNamedType.
 */
export type ApimSetHeaderType = WithNamedType & {
  value?: string;
  type: SetHeaderTypes;
};

/**
 * Type for checking headers, extends WithNamedType.
 */
export type ApimCheckHeaderType = WithNamedType & {
  value?: string[];
};

/**
 * Type for mocking responses.
 */
export type ApimMockPropsType = {
  code?: number;
  contentType?: string;
};

/**
 * Type for rewriting URIs.
 */
export type ApimRewriteUriType = {
  template?: string;
};

/**
 * Type for rate limiting configuration.
 */
export type ApimRateLimitType = {
  /** Number of calls */
  calls?: number;
  /** Time period in seconds */
  inSecond?: number;
  /** Apply only to successful responses */
  successConditionOnly?: boolean;
};

/**
 * Type for output caching configuration.
 */
export type ApimOutCacheType = {
  duration?: number;
};

/**
 * Type for authentication certificate configuration.
 */
export type ApimAuthCertType = {
  thumbprint: string;
};

/**
 * Type for client certificate configuration, extends Partial<ApimAuthCertType>.
 */
export type ApimClientCertType = Partial<ApimAuthCertType> & {
  issuer?: string;
  subject?: string;
  verifyCert?: boolean;
};

/**
 * Type for CORS configuration.
 */
export type ApimCorsType = {
  origins?: string[];
};

/**
 * Type for client IP header configuration.
 */
export type ApimClientIpHeaderType = {
  /** Example: `x-${organization}-clientIp` */
  headerKey: string;
};

/**
 * Type for validating JWT whitelist IPs.
 */
export type ApimValidateJwtWhitelistIpType = {
  claimKey: 'client_IpWhitelist' | string;
};

/**
 * Type for IP address whitelisting.
 */
export type ApimWhitelistIpType = {
  ipAddresses: string[];
};

/**
 * Type for find and replace operations.
 */
export type ApimFindAndReplaceType = {
  from: string;
  to: string;
};

/**
 * Type for custom policies.
 */
export type ApimCustomPolicyType = {
  policy: string;
};

/**
 * Interface for building APIM policies.
 */
export interface IApimPolicyBuilder {
  /**
   * Sets the base URL.
   * @param props - The base URL configuration.
   * @returns The policy builder instance.
   */
  setBaseUrl(props: ApimBaseUrlType): IApimPolicyBuilder;

  /**
   * Sets a header.
   * @param props - The header configuration.
   * @returns The policy builder instance.
   */
  setHeader(props: ApimSetHeaderType): IApimPolicyBuilder;

  /**
   * Checks a header.
   * @param props - The header check configuration.
   * @returns The policy builder instance.
   */
  checkHeader(props: ApimCheckHeaderType): IApimPolicyBuilder;

  /**
   * Mocks a response.
   * @param props - The mock response configuration.
   * @returns The policy builder instance.
   */
  mockResponse(props: ApimMockPropsType): IApimPolicyBuilder;

  /**
   * Rewrites a URI.
   * @param props - The URI rewrite configuration.
   * @returns The policy builder instance.
   */
  rewriteUri(props: ApimRewriteUriType): IApimPolicyBuilder;

  /**
   * Sets rate limiting.
   * @param props - The rate limit configuration.
   * @returns The policy builder instance.
   */
  setRateLimit(props: ApimRateLimitType): IApimPolicyBuilder;

  /**
   * Sets cache options.
   * @param props - The cache options configuration.
   * @returns The policy builder instance.
   */
  setCacheOptions(props: ApimOutCacheType): IApimPolicyBuilder;

  /**
   * Sets a backend certificate.
   * @param props - The backend certificate configuration.
   * @returns The policy builder instance.
   */
  setBackendCert(props: ApimAuthCertType): IApimPolicyBuilder;

  /**
   * Verifies a client certificate.
   * @param props - The client certificate configuration.
   * @returns The policy builder instance.
   */
  verifyClientCert(props: ApimClientCertType): IApimPolicyBuilder;

  /**
   * Sets CORS options.
   * @param props - The CORS configuration.
   * @returns The policy builder instance.
   */
  setCors(props: ApimCorsType): IApimPolicyBuilder;

  /**
   * Sets a client IP header.
   * @param props - The client IP header configuration.
   * @returns The policy builder instance.
   */
  setClientIpHeader(props: ApimClientIpHeaderType): IApimPolicyBuilder;

  /**
   * Validates JWT whitelist IPs.
   * @param props - The JWT whitelist IP configuration.
   * @returns The policy builder instance.
   */
  validateJwtWhitelistIp(
    props: ApimValidateJwtWhitelistIpType,
  ): IApimPolicyBuilder;

  /**
   * Sets IP address whitelisting.
   * @param props - The IP address whitelist configuration.
   * @returns The policy builder instance.
   */
  setWhitelistIPs(props: ApimWhitelistIpType): IApimPolicyBuilder;

  /**
   * Sets find and replace operations.
   * @param props - The find and replace configuration.
   * @returns The policy builder instance.
   */
  setFindAndReplaces(props: ApimFindAndReplaceType): IApimPolicyBuilder;

  // Custom Policies (commented out)
  // /**
  //  * Adds an inbound custom policy.
  //  * @param props - The custom policy configuration.
  //  * @returns The policy builder instance.
  //  */
  // withInboundPolicy(props: ApimCustomPolicyType): IApimPolicyBuilder;

  // /**
  //  * Adds an outbound custom policy.
  //  * @param props - The custom policy configuration.
  //  * @returns The policy builder instance.
  //  */
  // withOutPolicy(props: ApimCustomPolicyType): IApimPolicyBuilder;

  /**
   * Builds the policy and returns it as a string.
   * @returns The built policy as a string.
   */
  build(): string;
}