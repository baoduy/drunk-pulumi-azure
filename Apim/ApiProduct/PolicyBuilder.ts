import { isPrd } from '../../Common/AzureEnv';
import { getIpsRange } from '../../VNet/Helper';
import { organizationName } from '../../Common/config';

const defaultRateLimit = isPrd ? 60 : 120;
const enableApimEventHub = false;

interface MockProps {
  code?: number;
  contentType?: string;
}

const getInMockResponse = ({
  code = 200,
  contentType = 'text/html',
}: MockProps) =>
  `      <mock-response status-code="${code}" content-type="${contentType}" />`;

interface RewriteUriProps {
  template?: string;
}

const getInRewriteUri = ({ template = '/' }: RewriteUriProps) =>
  `      <rewrite-uri template="${template}" />`;

interface BaseUrlProps {
  url: string;
}

const setBaseUrl = ({ url }: BaseUrlProps) =>
  `   <set-backend-service base-url="${url}" />`;

interface RateLimitProps {
  /** Number of call */
  call?: number;
  /** in period (second) */
  period?: number;
  /** only applied to the success condition `@(context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)` */
  successConditionOnly?: boolean;
}

const getInRateLimit = ({
  call = defaultRateLimit, //The number of call in
  period = 60, //1 minute
  successConditionOnly,
}: RateLimitProps) =>
  successConditionOnly
    ? `      <rate-limit-by-key calls="${call}" 
            renewal-period="${period}" 
            counter-key="@(context.Request.IpAddress)" 
            increment-condition="@(context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)" />`
    : `      <rate-limit-by-key calls="${call}" 
            renewal-period="${period}" 
            counter-key="@(context.Request.IpAddress)" />`;

const getInCache = () =>
  `      <cache-lookup vary-by-developer="false" 
            vary-by-developer-groups="false" 
            allow-private-response-caching="true" 
            must-revalidate="true" 
            downstream-caching-type="public" />`;

interface OutCacheProps {
  duration?: number;
}
const getOutCache = ({ duration = 60 }: OutCacheProps) =>
  `      <cache-store duration="${duration}" />`;

interface AuthCertProps {
  thumbprint: string;
}

const getInBackendCert = ({ thumbprint }: AuthCertProps) =>
  `      <authentication-certificate thumbprint="${thumbprint}" />`;

export interface ClientCertProps extends Partial<AuthCertProps> {
  issuer?: string;
  subject?: string;
  verifyCert?: boolean;
}

const getInClientCertValidate = ({
  issuer,
  subject,
  thumbprint,
  verifyCert,
}: ClientCertProps) =>
  `   <choose>
        <when condition="@(context.Request.Certificate == null${
          verifyCert
            ? ' || !context.Request.Certificate.VerifyNoRevocation()'
            : ''
        }${
    issuer ? ` || context.Request.Certificate.Issuer != "${issuer}"` : ''
  }${
    subject
      ? ` || context.Request.Certificate.SubjectName.Name != "${subject}"`
      : ''
  }${
    thumbprint
      ? ` || context.Request.Certificate.Thumbprint != "${thumbprint}"`
      : ''
  })" >
          <return-response>
            <set-status code="403" reason="Invalid client certificate" />
          </return-response>
      </when>
    </choose>`;

interface CorsProps {
  origins?: string[];
}

const getCorsPolicy = ({ origins }: CorsProps) => {
  const orgs = origins
    ? origins.map((o) => `<origin>${o}</origin>`)
    : ['<origin>*</origin>'];

  return `<cors allow-credentials="${Array.isArray(origins)}">
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
};

interface EventHubProps {
  eventHubName: string;
  captureClientCertThumbprint?: boolean;
  azFuncUrl?: string;
  azFuncKey?: string;
}
//Event Hub Policy
const getEventHubPolicy = ({
  eventHubName,
  captureClientCertThumbprint,
  azFuncUrl,
  azFuncKey,
}: EventHubProps) => {
  const enableIpStack = azFuncKey && azFuncUrl;

  const rs = `
  <set-variable name="message-id" value="@(Guid.NewGuid())" />
  ${
    enableIpStack
      ? `
  <set-variable name="ipstackBaseUrl" value="@("${azFuncUrl}?ipAddress=" + context.Request.IpAddress)" />
  <send-request mode="new" response-variable-name="ipstackResponse" timeout="2" ignore-error="true">
    <set-url>@((string)context.Variables["ipstackBaseUrl"])</set-url>
    <set-method>POST</set-method>
    <set-header name="x-functions-key" exists-action="override">
      <value>${azFuncKey}</value>
    </set-header>
  </send-request>`
      : ''
  }

  <log-to-eventhub logger-id="${eventHubName}" partition-id="0">@{
      string accountId = "";
      string profileId = "";

      string authHeader = context.Request.Headers.GetValueOrDefault("Authorization", "");
      if (authHeader?.Length > 0)
      {
        string[] authHeaderParts = authHeader.Split(' ');
        if (authHeaderParts?.Length == 2 && authHeaderParts[0].Equals("Bearer", StringComparison.InvariantCultureIgnoreCase))
        {
          Jwt jwt;
          if (authHeaderParts[1].TryParseJwt(out jwt))
          {
            accountId = jwt.Claims.GetValueOrDefault("client_AccountId", "");
            profileId = jwt.Claims.GetValueOrDefault("client_ProfileId", "");
          }
        }
      }

      string statusText = (context.Response.StatusCode >= 200 && context.Response.StatusCode <= 299) ? "PASS" : "FAIL";
      string statusMsg = "";
      if (context.Response.StatusCode == 400 || context.Response.StatusCode == 500) {
          statusMsg = context.Response.Body?.As<string>(true);
      }

      string ipLocation = "";
${
  enableIpStack
    ? `
      try {
        var ipstackResponse = ((IResponse)context.Variables["ipstackResponse"]);
        if (ipstackResponse.StatusCode == 200) { 
            ipLocation = (((IResponse)context.Variables["ipstackResponse"]).Body?.As<JObject>()["country_name"]).ToString();
        }
      }catch {}`
    : ''
}

      string clientThumbprint = "";
${
  captureClientCertThumbprint
    ? `
      string xCert = context.Request.Headers.GetValueOrDefault("X-ARR-ClientCert", "");
      if(context.Request.Certificate != null){
        clientThumbprint = context.Request.Certificate.Thumbprint;
      }else if(xCert?.Length > 0){
        var cert = new X509Certificate2(Convert.FromBase64String(xCert), (string)null);
        clientThumbprint = cert.Thumbprint;
      }
      else{ clientThumbprint = "Not found";}
`
    : ''
}

      return new JObject(
        new JProperty("MessageId", context.Variables["message-id"]),
        new JProperty("Method", context.Request.Method),
        new JProperty("UrlPath", context.Request.Url.Path),
        new JProperty("Timestamp", DateTime.UtcNow.ToString()),
        new JProperty("IP_Address", context.Request.IpAddress),
        new JProperty("IP_Location", ipLocation),
        new JProperty("AccountId", accountId),
        new JProperty("ProfileId", profileId),
        new JProperty("Status", statusText),
        new JProperty("HttpCode", context.Response.StatusCode),
        new JProperty("Status_Message", statusMsg),
        new JProperty("clientThumbprint", clientThumbprint)
      ).ToString();
  }</log-to-eventhub>`;

  //console.log(rs);
  return rs;
};

/** Validate Client IP Address with configured IP in Token. */
const getIPAddressFilterPolicy = () => {
  const getFilterStatus = `
    <set-header name="IpAddressValidation" exists-action="override">
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
							var ipsWhitelist = jwt.Claims.GetValueOrDefault("client_IpWhitelist", "");
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

  const checkFilterValid = `
    <choose>
		  <when condition="@(context.Request.Headers.GetValueOrDefault("IpAddressValidation", "").Equals(Boolean.FalseString))">
        <return-response>
            <set-status code="403" reason="Forbidden"/>
              <set-body>@{
                return new JObject(
                  new JProperty("message","IP does not match")
                ).ToString();
              }</set-body>
        </return-response>
		  </when>
		</choose>`;

  return `
    ${getFilterStatus}
    ${checkFilterValid}
  `;
};

interface WhitelistIpProps {
  ipAddresses: string[];
}

const getIpWhitelistPolicy = ({ ipAddresses }: WhitelistIpProps) => {
  const policy = `<ip-filter action="allow">\r\n${ipAddresses
    .map((ip) => {
      if (ip.includes('/')) {
        const range = getIpsRange(ip);
        return `<address-range from="${range.first}" to="${range.last}" />`;
      }
      return `<address>${ip}</address>`;
    })
    .join('\r\n')}\r\n</ip-filter>`;

  //console.log(policy);
  return policy;
};

export enum SetHeaderTypes {
  delete = 'delete',
  override = 'override',
  skip = 'skip',
  append = 'append',
}

interface SetHeaderProps {
  name: string;
  value?: string;
  type: SetHeaderTypes;
}

const setHeader = ({
  name,
  type = SetHeaderTypes.delete,
  value,
}: SetHeaderProps) => {
  let rs = `<set-header name="${name}" exists-action="${type}">`;

  if (value) {
    rs += ` <value>${value}</value>`;
  }
  rs += '</set-header>';

  return rs;
};

interface CheckHeaders {
  checkHeaders: Array<{ name: string; value?: string[] }>;
}

const checkHeaderPolicy = ({ checkHeaders }: CheckHeaders) => {
  return checkHeaders
    .map((c) => {
      return `<check-header name="${
        c.name
      }" failed-check-httpcode="401" failed-check-error-message="The header ${
        c.name
      } is not found" ignore-case="true">
    ${c.value ? c.value.map((v) => `<value>${v}</value>`).join('\n') : ''}
</check-header>`;
    })
    .join('\n');
};

/** Set Client IP address to 'x-ts-client-ip' header key */
const setClientIpHeader = (key: string = `x-${organizationName}-clientIp`) =>
  setHeader({
    name: key,
    value: '@(context.Request.IpAddress)',
    type: SetHeaderTypes.override,
  });

const setFindAndReplaces = (
  findAndReplaces: Array<{ from: string; to: string }>
) =>
  findAndReplaces
    .map((f) => ` <find-and-replace from="${f.from}" to="${f.to}" />`)
    .join('\n');

export interface PoliciesProps {
  setBaseUrl?: BaseUrlProps;
  setHeaders?: Array<SetHeaderProps> | SetHeaderProps;
  checkHeaders?: CheckHeaders;
  mockResponse?: MockProps | boolean;
  rewriteUri?: RewriteUriProps | boolean;
  rateLimit?: RateLimitProps | boolean;
  cache?: OutCacheProps | boolean;
  backendCert?: AuthCertProps;
  clientCert?: ClientCertProps;
  cors?: CorsProps | boolean;
  enableClientIpHeader?: boolean;

  logEventHubName?: string;
  captureClientCertThumbprint?: boolean;
  azFuncUrl?: string;
  azFuncKey?: string;

  /** Filter IP from Bearer Token */
  ipFilter?: boolean;
  /** IP Address Whitelisting */
  whitelistIPs?: string[];

  /**Replace outbound results */
  findAndReplaces?: Array<{ from: string; to: string }>;

  //Custom Policies
  customInboundPolicy?: string;
  customOutPolicy?: string;
}

export const getPolicies = ({
  enableClientIpHeader = false,
  findAndReplaces,
  ...props
}: PoliciesProps) => {
  const inbound = new Array<string>();
  const outbound = new Array<string>();

  const getProps = <T>(p: T) => (typeof p === 'boolean' ? {} : p);

  if (enableClientIpHeader) {
    inbound.push(setClientIpHeader());
  }
  if (props.setBaseUrl) {
    inbound.push(setBaseUrl(props.setBaseUrl));
  }
  if (props.rewriteUri) {
    inbound.push(getInRewriteUri(getProps(props.rewriteUri)));
  }
  if (props.cache) {
    inbound.push(getInCache());
    outbound.push(getOutCache(getProps(props.cache)));
  }
  if (props.mockResponse) {
    inbound.push(getInMockResponse(getProps(props.mockResponse)));
  }
  if (props.rateLimit) {
    inbound.push(getInRateLimit(getProps(props.rateLimit)));
  }

  if (props.backendCert) {
    inbound.push(getInBackendCert(props.backendCert));
  }

  if (props.cors) {
    inbound.push(getCorsPolicy(getProps(props.cors)));
  }

  if (props.ipFilter) {
    inbound.push(getIPAddressFilterPolicy());
  }

  if (props.whitelistIPs) {
    inbound.push(getIpWhitelistPolicy({ ipAddresses: props.whitelistIPs }));
  }

  if (props.setHeaders) {
    const array = Array.isArray(props.setHeaders)
      ? props.setHeaders
      : [props.setHeaders];

    array.forEach((s) => inbound.push(setHeader(s)));
  }

  if (props.checkHeaders) {
    inbound.push(checkHeaderPolicy(props.checkHeaders));
  }

  if (findAndReplaces) {
    outbound.push(setFindAndReplaces(findAndReplaces));
  }

  if (props.customInboundPolicy) {
    inbound.push(props.customInboundPolicy);
  }
  if (props.customOutPolicy) {
    outbound.push(props.customOutPolicy);
  }
  //======This always in the last position.===========
  if (props.clientCert) {
    inbound.push(getInClientCertValidate(props.clientCert));
  }

  let backend = '<base />';

  if (!props.mockResponse) {
    backend =
      '<forward-request timeout="120" follow-redirects="true" buffer-request-body="true" fail-on-error-status-code="true"/>';
  }

  return `<policies>
  <inbound>
      <base />
      ${inbound.join('\n')}
  </inbound>
  <backend>
      ${backend}
  </backend>
  <outbound>
      <base />
      <set-header name="Strict-Transport-Security" exists-action="override">    
          <value>max-age=15724800; includeSubDomains</value>    
      </set-header>    
      <set-header name="X-XSS-Protection" exists-action="override">    
          <value>1; mode=block</value>    
      </set-header>    
      <set-header name="Content-Security-Policy" exists-action="override">    
          <value>default-src 'self' data: 'unsafe-inline' 'unsafe-eval'</value>    
      </set-header>    
      <set-header name="X-Frame-Options" exists-action="override">    
          <value>Deny</value>    
      </set-header>    
      <set-header name="X-Content-Type-Options" exists-action="override">    
          <value>nosniff</value>    
      </set-header>    
      <set-header name="Expect-Ct" exists-action="override">    
          <value>max-age=604800,enforce</value>    
      </set-header>    
      <set-header name="Cache-Control" exists-action="override">    
          <value>none</value>    
      </set-header>    
      <set-header name="X-Powered-By" exists-action="delete" />    
      <set-header name="X-AspNet-Version" exists-action="delete" />
      
      ${outbound.join('\n')}
      ${
        enableApimEventHub && props.logEventHubName
          ? getEventHubPolicy({
              eventHubName: props.logEventHubName,
              azFuncUrl: props.azFuncUrl,
              azFuncKey: props.azFuncKey,
              captureClientCertThumbprint: props.captureClientCertThumbprint,
            })
          : ''
      }
  </outbound>
  <on-error>
      <base />
      ${
        enableApimEventHub && props.logEventHubName
          ? getEventHubPolicy({
              eventHubName: props.logEventHubName,
              azFuncUrl: props.azFuncUrl,
              azFuncKey: props.azFuncKey,
              captureClientCertThumbprint: props.captureClientCertThumbprint,
            })
          : ''
      }
  </on-error>
</policies>`;
};
