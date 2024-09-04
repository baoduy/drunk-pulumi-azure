import * as apim from '@pulumi/azure-native/apimanagement';
import { organization } from '../Common';
import { getIpsRange } from '../VNet/Helper';
import * as types from './types';
import { ApimForwardToServiceBusType } from './types';

export default class ApimPolicyBuilder implements types.IApimPolicyBuilder {
  private _inboundPolicies: string[] = [];
  private _outboundPolicies: string[] = [];
  private _certVerification: types.ApimClientCertType | undefined = undefined;
  private _mockResponse: boolean = false;
  private _cors: types.ApimCorsType | undefined = undefined;

  public constructor(private args: types.ApimChildBuilderProps) {}

  public authBasic(props: types.ApimAuthBasicType): types.IApimPolicyBuilder {
    this._inboundPolicies.push(
      `\t<authentication-basic username="${props.userName}" password="${props.password}" />`,
    );
    return this;
  }

  public authCert(props: types.ApimAuthCertType): types.IApimPolicyBuilder {
    this._inboundPolicies.push(
      'thumbprint' in props
        ? `\t<authentication-certificate thumbprint="${props.thumbprint}" />`
        : `\t<authentication-certificate certificate-id="${props.certId}" password="${props.password}" />`,
    );
    return this;
  }

  public authIdentity(
    props: types.ApimAuthIdentityType,
  ): types.IApimPolicyBuilder {
    this._inboundPolicies.push(
      'clientId' in props
        ? `\t<authentication-managed-identity resource="${props.resource}" client-id="${props.clientId}" output-token-variable-name="${props.variableName}" ignore-error="${props.ignoreError}"/>`
        : `\t<authentication-managed-identity resource="${props.resource}" output-token-variable-name="${props.variableName}" ignore-error="${props.ignoreError}"/>`,
    );

    if (props.setHeaderKey)
      this.setHeader({
        name: props.setHeaderKey,
        type: types.SetHeaderTypes.override,
        value: `@((string) context.Variables[&quot;${props.variableName}&quot;])`,
      });

    return this;
  }

  public setBaseUrl(props: types.ApimBaseUrlType): types.IApimPolicyBuilder {
    this._inboundPolicies.push(
      `\t<set-backend-service base-url="${props.url}" />`,
    );
    return this;
  }

  public setHeader(props: types.ApimSetHeaderType): types.IApimPolicyBuilder {
    let rs = `\t<set-header name="${props.name}" exists-action="${props.type}">`;
    if (props.value) {
      rs += ` <value>${props.value}</value>`;
    }
    rs += '</set-header>';

    this._inboundPolicies.push(rs);
    return this;
  }

  public checkHeader(
    props: types.ApimCheckHeaderType,
  ): types.IApimPolicyBuilder {
    const rs = `\t<check-header name="${
      props.name
    }" failed-check-httpcode="401" failed-check-error-message="The header ${
      props.name
    } is not found" ignore-case="true">
    ${props.value ? props.value.map((v) => `<value>${v}</value>`).join('\n') : ''}
\t</check-header>`;

    this._inboundPolicies.push(rs);
    return this;
  }

  public mockResponse(
    props: types.ApimMockPropsType,
  ): types.IApimPolicyBuilder {
    this._inboundPolicies.push(
      `<mock-response status-code="${props.code ?? 200}" content-type="${props.contentType ?? 'application/json'}" />`,
    );
    this._mockResponse = true;
    return this;
  }

  public rewriteUri(props: types.ApimRewriteUriType): types.IApimPolicyBuilder {
    this._inboundPolicies.push(
      `<rewrite-uri template="${props.template ?? '/'}" />`,
    );
    return this;
  }

  public setRateLimit(
    props: types.ApimRateLimitType,
  ): types.IApimPolicyBuilder {
    this._inboundPolicies.push(
      props.successConditionOnly
        ? `<rate-limit-by-key calls="${props.calls ?? 10}" renewal-period="${props.inSecond ?? 10}" counter-key="@(context.Request.IpAddress)" increment-condition="@(context.Response.StatusCode &gt;= 200 &amp;&amp; context.Response.StatusCode &lt; 300)" />`
        : `<rate-limit-by-key calls="${props.calls ?? 10}" renewal-period="${props.inSecond ?? 10}" counter-key="@(context.Request.IpAddress)" />`,
    );
    return this;
  }

  public setCacheOptions(
    props: types.ApimOutCacheType,
  ): types.IApimPolicyBuilder {
    this._inboundPolicies.push(`<cache-lookup vary-by-developer="false" 
            vary-by-developer-groups="false" 
            allow-private-response-caching="true" 
            must-revalidate="true" 
            downstream-caching-type="public" />`);
    this._outboundPolicies.push(
      `<cache-store duration="${props.duration ?? 60}" />`,
    );
    return this;
  }

  public setCors(props: types.ApimCorsType): types.IApimPolicyBuilder {
    this._cors = props;
    return this;
  }

  public setClientIpHeader(
    props: types.ApimClientIpHeaderType,
  ): types.IApimPolicyBuilder {
    this.setHeader({
      name: props.headerKey ?? `x-${organization}-clientIp`,
      value: '@(context.Request.IpAddress)',
      type: types.SetHeaderTypes.override,
    });
    return this;
  }

  /** Filter IP from Bearer Token */
  public validateJwtWhitelistIp(
    props: types.ApimValidateJwtWhitelistIpType,
  ): types.IApimPolicyBuilder {
    const claimKey = props.claimKey ?? 'client_IpWhitelist';
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
		<when condition="@(context.Request.Headers.GetValueOrDefault(&quot;IpAddressValidation&quot;, &quot;&quot;).Equals(Boolean.FalseString))">
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
    const pfName = `${this.args.name}-PolicyFragment`;
    new apim.PolicyFragment(pfName, {
      id: pfName,
      description: pfName,
      serviceName: this.args.apimServiceName,
      resourceGroupName: this.args.group.resourceGroupName,
      format: 'xml',
      value: `
        <fragment>
            ${setHeader}
            ${checkHeader}
        </fragment>
      `,
    });

    this._inboundPolicies.push(`<include-fragment fragment-id="${pfName}" />`);
    return this;
  }

  /** IP Address Whitelisting */
  public setWhitelistIPs(
    props: types.ApimWhitelistIpType,
  ): types.IApimPolicyBuilder {
    const ipAddresses = props.ipAddresses;
    const policy = `\t<ip-filter action="allow">\r\n${ipAddresses
      .map((ip) => {
        if (ip.includes('/')) {
          const range = getIpsRange(ip);
          return `<address-range from="${range.first}" to="${range.last}" />`;
        }
        return `<address>${ip}</address>`;
      })
      .join('\r\n')}
\t</ip-filter>`;

    this._inboundPolicies.push(policy);
    return this;
  }

  /**Replace outbound results */
  public setFindAndReplaces(
    props: types.ApimFindAndReplaceType,
  ): types.IApimPolicyBuilder {
    this._outboundPolicies.push(
      `<find-and-replace from="${props.from}" to="${props.to}" />`,
    );
    return this;
  }

  public verifyClientCert(
    props: types.ApimClientCertType,
  ): types.IApimPolicyBuilder {
    this._certVerification = props;
    return this;
  }

  public forwardToServiceBus(
    props: types.ApimForwardToServiceBusType,
  ): types.IApimPolicyBuilder {
    this.authIdentity({
      variableName: 'x-forward-to-bus',
      setHeaderKey: 'Authorization',
      resource: 'https://servicebus.azure.net',
      ignoreError: false,
    });
    this.setBaseUrl({
      url: `https://${props.serviceBusName}.servicebus.windows.net`,
    });
    this.rewriteUri({ template: `${props.topicOrQueueName}/messages` });
    if (props.brokerProperties) {
      this.setHeader({
        name: 'BrokerProperties',
        type: types.SetHeaderTypes.override,
        value: JSON.stringify(props.brokerProperties),
      });
    }
    return this;
  }

  private buildCors() {
    if (!this._cors) return;
    const orgs = this._cors?.origins
      ? this._cors!.origins!.map((o) => `<origin>${o}</origin>`)
      : ['<origin>*</origin>'];

    const cors = `<cors allow-credentials="${Array.isArray(this._cors?.origins)}">
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

  private buildCertVerification() {
    if (!this._certVerification) return;

    this._inboundPolicies.push(`<choose>
        <when condition="@(context.Request.Certificate == null${
          this._certVerification.verifyCert
            ? ' || !context.Request.Certificate.VerifyNoRevocation()'
            : ''
        }${
          this._certVerification.issuer
            ? ` || context.Request.Certificate.Issuer != "${this._certVerification.issuer}"`
            : ''
        }${
          this._certVerification.subject
            ? ` || context.Request.Certificate.SubjectName.Name != "${this._certVerification.subject}"`
            : ''
        }${
          this._certVerification.thumbprint
            ? ` || context.Request.Certificate.Thumbprint != "${this._certVerification.thumbprint}"`
            : ''
        })" >
          <return-response>
            <set-status code="403" reason="Invalid client certificate" />
          </return-response>
      </when>
    </choose>`);
  }

  public build(): string {
    this.buildCors();
    //This must be a last rule
    this.buildCertVerification();

    let backend = '<base />';
    if (!this._mockResponse) {
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

    return xmlPolicy;
  }
}
