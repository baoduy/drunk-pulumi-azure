import * as apim from '@pulumi/azure-native/apimanagement';
import { organization } from '../Common';
import { getIpsRange } from '../VNet/Helper';
import xmlFormat from 'xml-formatter';
import {
  ApimAuthCertType,
  ApimBaseUrlType,
  ApimCheckHeaderType,
  ApimChildBuilderProps,
  ApimClientCertType,
  ApimClientIpHeaderType,
  ApimCorsType,
  ApimFindAndReplaceType,
  ApimMockPropsType,
  ApimOutCacheType,
  ApimRateLimitType,
  ApimRewriteUriType,
  ApimSetHeaderType,
  ApimValidateJwtWhitelistIpType,
  ApimWhitelistIpType,
  IApimPolicyBuilder,
  SetHeaderTypes,
} from './types';
import * as console from 'node:console';

export default class ApimPolicyBuilder implements IApimPolicyBuilder {
  private _baseUrl: ApimBaseUrlType | undefined = undefined;
  private _rewriteUri: ApimRewriteUriType | undefined = undefined;
  private _rateLimit: ApimRateLimitType | undefined = undefined;
  private _cacheOptions: ApimOutCacheType | undefined = undefined;
  private _backendCert: ApimAuthCertType | undefined = undefined;
  private _verifyClientCert: ApimClientCertType | undefined = undefined;
  private _cors: ApimCorsType | undefined = undefined;
  private _validateJwtWhitelistIp: ApimValidateJwtWhitelistIpType | undefined =
    undefined;
  private _mockResponses: ApimMockPropsType[] = [];
  private _headers: ApimSetHeaderType[] = [];
  private _checkHeaders: ApimCheckHeaderType[] = [];
  private _whitelistIps: ApimWhitelistIpType[] = [];
  private _findAndReplaces: ApimFindAndReplaceType[] = [];
  //private _inboundCustomPolicies: ApimCustomPolicyType[] = [];
  //private _outboundCustomPolicies: ApimCustomPolicyType[] = [];

  private _inboundPolicies: string[] = [];
  private _outboundPolicies: string[] = [];

  public constructor(private props: ApimChildBuilderProps) {}

  public setBaseUrl(props: ApimBaseUrlType): IApimPolicyBuilder {
    this._baseUrl = props;
    return this;
  }
  public setHeader(props: ApimSetHeaderType): IApimPolicyBuilder {
    this._headers.push(props);
    return this;
  }
  public checkHeader(props: ApimCheckHeaderType): IApimPolicyBuilder {
    this._checkHeaders.push(props);
    return this;
  }
  public mockResponse(props: ApimMockPropsType): IApimPolicyBuilder {
    this._mockResponses.push(props);
    return this;
  }
  public rewriteUri(props: ApimRewriteUriType): IApimPolicyBuilder {
    this._rewriteUri = props;
    return this;
  }
  public setRateLimit(props: ApimRateLimitType): IApimPolicyBuilder {
    this._rateLimit = props;
    return this;
  }
  public setCacheOptions(props: ApimOutCacheType): IApimPolicyBuilder {
    this._cacheOptions = props;
    return this;
  }
  public setBackendCert(props: ApimAuthCertType): IApimPolicyBuilder {
    this._backendCert = props;
    return this;
  }
  public verifyClientCert(props: ApimClientCertType): IApimPolicyBuilder {
    this._verifyClientCert = props;
    return this;
  }
  public setCors(props: ApimCorsType): IApimPolicyBuilder {
    this._cors = props;
    return this;
  }
  public setClientIpHeader(props: ApimClientIpHeaderType): IApimPolicyBuilder {
    this._headers.push({
      name: props.headerKey ?? `x-${organization}-clientIp`,
      value: '@(context.Request.IpAddress)',
      type: SetHeaderTypes.override,
    });
    return this;
  }

  /** Filter IP from Bearer Token */
  public validateJwtWhitelistIp(
    props: ApimValidateJwtWhitelistIpType,
  ): IApimPolicyBuilder {
    this._validateJwtWhitelistIp = props;
    return this;
  }

  /** IP Address Whitelisting */
  public setWhitelistIPs(props: ApimWhitelistIpType): IApimPolicyBuilder {
    this._whitelistIps.push(props);
    return this;
  }

  /**Replace outbound results */
  public setFindAndReplaces(props: ApimFindAndReplaceType): IApimPolicyBuilder {
    this._findAndReplaces.push(props);
    return this;
  }

  //Custom Policies
  // public withInboundPolicy(props: ApimCustomPolicyType): IApimPolicyBuilder {
  //   this._inboundCustomPolicies.push(props);
  //   return this;
  // }
  // public withOutPolicy(props: ApimCustomPolicyType): IApimPolicyBuilder {
  //   this._outboundCustomPolicies.push(props);
  //   return this;
  // }

  private buildBaseUrl() {
    if (!this._baseUrl) return;
    this._inboundPolicies.push(
      `<set-backend-service base-url="${this._baseUrl.url}"></set-backend-service>`,
    );
  }

  private buildHeaders() {
    this._inboundPolicies.push(
      ...this._headers.map((h) => {
        let rs = `<set-header name="${h.name}" exists-action="${h.type}">`;
        if (h.value) {
          rs += ` <value>${h.value}</value>`;
        }
        rs += '</set-header>';
        return rs;
      }),
    );
  }

  private buildCheckHeaders() {
    this._inboundPolicies.push(
      ...this._checkHeaders.map(
        (ch) => `<check-header name="${
          ch.name
        }" failed-check-httpcode="401" failed-check-error-message="The header ${
          ch.name
        } is not found" ignore-case="true">
    ${ch.value ? ch.value.map((v) => `<value>${v}</value>`).join('\n') : ''}
</check-header>`,
      ),
    );
  }

  private buildMockResponse() {
    this._inboundPolicies.push(
      ...this._mockResponses.map(
        (m) =>
          `<mock-response status-code="${m.code ?? 200}" content-type="${m.contentType ?? 'application/json'}" />`,
      ),
    );
  }

  private buildRewriteUri() {
    if (!this._rewriteUri) return;

    this._inboundPolicies.push(
      `<rewrite-uri template="${this._rewriteUri.template ?? '/'}" />`,
    );
  }

  private buildRateLimit() {
    if (!this._rateLimit) return;
    this._inboundPolicies.push(
      this._rateLimit.successConditionOnly
        ? `<rate-limit-by-key calls="${this._rateLimit.calls ?? 10}" renewal-period="${this._rateLimit.inSecond ?? 10}" counter-key="@(context.Request.IpAddress)" increment-condition="@(context.Response.StatusCode &gt;= 200 &amp;&amp; context.Response.StatusCode &lt; 300)" />`
        : `<rate-limit-by-key calls="${this._rateLimit.calls ?? 10}" renewal-period="${this._rateLimit.inSecond ?? 10}" counter-key="@(context.Request.IpAddress)" />`,
    );
  }

  private buildCacheOptions() {
    if (!this._cacheOptions) return;
    this._inboundPolicies.push(`<cache-lookup vary-by-developer="false" 
            vary-by-developer-groups="false" 
            allow-private-response-caching="true" 
            must-revalidate="true" 
            downstream-caching-type="public" />`);
    this._outboundPolicies.push(
      `<cache-store duration="${this._cacheOptions.duration ?? 60}" />`,
    );
  }

  private buildBackendCert() {
    if (!this._backendCert) return;
    this._inboundPolicies.push(
      `<authentication-certificate thumbprint="${this._backendCert.thumbprint}" />`,
    );
  }

  private buildVerifyClientCert() {
    if (!this._verifyClientCert) return;
    this._inboundPolicies.push(`<choose>
        <when condition="@(context.Request.Certificate == null${
          this._verifyClientCert.verifyCert
            ? ' || !context.Request.Certificate.VerifyNoRevocation()'
            : ''
        }${
          this._verifyClientCert.issuer
            ? ` || context.Request.Certificate.Issuer != "${this._verifyClientCert.issuer}"`
            : ''
        }${
          this._verifyClientCert.subject
            ? ` || context.Request.Certificate.SubjectName.Name != "${this._verifyClientCert.subject}"`
            : ''
        }${
          this._verifyClientCert.thumbprint
            ? ` || context.Request.Certificate.Thumbprint != "${this._verifyClientCert.thumbprint}"`
            : ''
        })" >
          <return-response>
            <set-status code="403" reason="Invalid client certificate" />
          </return-response>
      </when>
    </choose>`);
  }

  private buildCors() {
    if (!this._cors) return;
    const orgs = this._cors.origins
      ? this._cors.origins.map((o) => `<origin>${o}</origin>`)
      : ['<origin>*</origin>'];

    const cors = `<cors allow-credentials="${Array.isArray(this._cors.origins)}">
    <allowed-origins>
        ${orgs.join('\n')}
    </allowed-origins>
    <allowed-methods preflight-result-max-age="300">
        <method>*</method>
    </allowed-methods>
    <allowed-headers>
        <header>*</header>
    </allowed-headers>
</cors>`;
    this._inboundPolicies.push(cors);
  }

  private buildValidateJwtWhitelistIp() {
    if (!this._validateJwtWhitelistIp) return;
    const claimKey =
      this._validateJwtWhitelistIp.claimKey ?? 'client_IpWhitelist';
    const setHeader = `<set-header name="IpAddressValidation" exists-action="override">
      <value>@{
		Boolean ipAddressValid = false;
		string authHeader = context.Request.Headers.GetValueOrDefault("Authorization", "");
		if (authHeader?.Length > 0)
		{
			string[] authHeaderParts = authHeader.Split(' ');
			if (authHeaderParts?.Length == 2 && authHeaderParts[0].Equals("Bearer", StringComparison.InvariantCultureIgnoreCase))
			{
				if (authHeaderParts[1].TryParseJwt(out Jwt jwt))
				{
					var ipsWhitelist = jwt.Claims.GetValueOrDefault("${claimKey}", "");
                    IEnumerable<string> ips = ipsWhitelist
                        .Split(new char[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(p => p.Trim());
              
                    if(string.IsNullOrEmpty(ipsWhitelist) || ips.Contains(context.Request.IpAddress))
                    {
                        ipAddressValid = true;
                    }
			    }
			}
        }
        else
        {
           ipAddressValid = true;
        }
				
        return ipAddressValid.ToString();
      }</value>
  </set-header>`;
    const checkHeader = `<choose>
		<when condition="@(context.Request.Headers.GetValueOrDefault("IpAddressValidation", "").Equals(Boolean.FalseString))">
        <return-response>
            <set-status code="403" reason="Forbidden"/>
              <set-body>@{
                return new JObject(
                  new JProperty("message","The IP does not match.")
                ).ToString();
              }</set-body>
        </return-response>
		 </when>
</choose>`;

    //Create Policy Fragment
    const pfName = `${this.props.name}-PolicyFragment`;
    new apim.PolicyFragment(pfName, {
      id: pfName,
      description: pfName,
      serviceName: this.props.apimServiceName,
      resourceGroupName: this.props.group.resourceGroupName,
      format: 'xml',
      value: xmlFormat(`
        <fragment>
            ${setHeader}
            ${checkHeader}
        </fragment>
      `),
    });
    this._inboundPolicies.push(`<include-fragment fragment-id="${pfName}" />`);
  }

  private buildWhiteListIps() {
    if (this._whitelistIps.length <= 0) return;

    const ipAddresses = this._whitelistIps.flatMap((ip) => ip.ipAddresses);
    const policy = `<ip-filter action="allow">\r\n${ipAddresses
      .map((ip) => {
        if (ip.includes('/')) {
          const range = getIpsRange(ip);
          return `<address-range from="${range.first}" to="${range.last}" />`;
        }
        return `<address>${ip}</address>`;
      })
      .join('\r\n')}
        </ip-filter>`;

    this._inboundPolicies.push(policy);
  }

  private buildFindAndReplace() {
    if (!this._findAndReplaces) return;
    this._outboundPolicies.push(
      ...this._findAndReplaces
        .map((f) => `<find-and-replace from="${f.from}" to="${f.to}" />`)
        .join('\n'),
    );
  }

  // private buildCustomRules() {
  //   if (this._inboundCustomPolicies) {
  //     this._inboundPolicies.push(
  //       ...this._inboundCustomPolicies.map((i) => i.policy),
  //     );
  //   }
  //   if (this._outboundPolicies) {
  //     this._outboundPolicies.push(
  //       ...this._outboundCustomPolicies.map((i) => i.policy),
  //     );
  //   }
  // }

  public build(): string {
    this.buildHeaders();
    this.buildBaseUrl();
    this.buildRewriteUri();
    this.buildCacheOptions();
    this.buildMockResponse();
    this.buildRateLimit();
    this.buildBackendCert();
    this.buildCors();
    this.buildValidateJwtWhitelistIp();
    this.buildWhiteListIps();
    this.buildCheckHeaders();
    this.buildFindAndReplace();
    //this.buildCustomRules();
    //This must be a last rule
    this.buildVerifyClientCert();

    let backend = '<base />';
    if (!this._mockResponses) {
      backend =
        '<forward-request timeout="120" follow-redirects="true" buffer-request-body="true" fail-on-error-status-code="true"/>';
    }

    const xmlPolicy = `<policies>
  <inbound>
      <base />
      ${this._inboundPolicies.join('\n')}
  </inbound>
  <backend>
      ${backend}
  </backend>
  <outbound>
      <base />
      <set-header name="Strict-Transport-Security" exists-action="override">    
          <value>max-age=3600; includeSubDomains</value>    
      </set-header>    
      <set-header name="X-XSS-Protection" exists-action="override">    
          <value>1; mode=block</value>    
      </set-header>    
      <set-header name="Content-Security-Policy" exists-action="override">    
          <value>default-src 'self' data:</value>    
      </set-header>    
      <set-header name="X-Frame-Options" exists-action="override">    
          <value>Deny</value>    
      </set-header>    
      <set-header name="X-Content-Type-Options" exists-action="override">    
          <value>nosniff</value>    
      </set-header>    
      <set-header name="Expect-Ct" exists-action="override">    
          <value>max-age=3600,enforce</value>    
      </set-header>    
      <set-header name="Cache-Control" exists-action="override">    
          <value>none</value>    
      </set-header>    
      <set-header name="X-Powered-By" exists-action="delete" />    
      <set-header name="X-AspNet-Version" exists-action="delete" />
      
      ${this._outboundPolicies.join('\n')}
  </outbound>
  <on-error>
      <base />
  </on-error>
</policies>`;

    return xmlFormat(xmlPolicy, {
      strictMode: false,
    });
  }
}
