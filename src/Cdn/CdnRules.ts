import * as native from "@pulumi/azure-native";

const getSecurities = (envDomain: string) => [
  "default-src 'self' data: 'unsafe-inline' 'unsafe-eval'",
  `https://*.${envDomain}`,
  "https://*.services.visualstudio.com",
  "https://*.googleapis.com", // Font and Css
  "https://*.gstatic.com", // Font and Css
  "https://*.google.com", // Captcha
  "https://login.microsoftonline.com",
  "https://graph.microsoft.com",
  "https://*.service.signalr.net",
  "wss://*.service.signalr.net",
  `frame-ancestors 'self' https://login.microsoftonline.com https://*.${envDomain}`,
];

export const getDefaultResponseHeaders = (
  envDomain: string,
): Record<string, string> => ({
  "Strict-Transport-Security": "max-age=86400; includeSubDomains",
  "X-XSS-Protection": "1; mode=block",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": getSecurities(envDomain).join(" "),
});

export const enforceHttpsRule: native.types.input.cdn.DeliveryRuleArgs = {
  name: "enforceHttps",
  order: 1,
  conditions: [
    {
      name: "RequestScheme",
      parameters: {
        matchValues: ["HTTP"],
        operator: "Equal",
        negateCondition: false,
        typeName: "DeliveryRuleRequestSchemeConditionParameters",
      },
    },
  ],
  actions: [
    {
      name: "UrlRedirect",
      parameters: {
        redirectType: "Found",
        destinationProtocol: "Https",
        typeName: "DeliveryRuleUrlRedirectActionParameters",
      },
    },
  ],
};

export const indexFileCacheRule: native.types.input.cdn.DeliveryRuleArgs = {
  name: "indexCache",
  order: 2,
  conditions: [
    {
      name: "UrlFileName",
      parameters: {
        operator: "Contains",
        negateCondition: false,
        matchValues: ["index.html"],
        transforms: ["Lowercase"],
        typeName: "DeliveryRuleUrlFilenameConditionParameters",
      },
    },
  ],
  actions: [
    {
      name: "CacheExpiration",
      parameters: {
        cacheBehavior: "Override",
        cacheType: "All",
        cacheDuration: "08:00:00",
        typeName: "DeliveryRuleCacheExpirationActionParameters",
      },
    },
  ],
};

export const getResponseHeadersRule = (
  rules: Record<string, string>,
): native.types.input.cdn.DeliveryRuleArgs => {
  return {
    name: "defaultResponseHeaders",
    order: 3,
    conditions: [
      {
        name: "UrlPath",
        parameters: {
          operator: "Any",
          negateCondition: false,
          matchValues: [],
          transforms: [],
          typeName: "DeliveryRuleUrlPathMatchConditionParameters",
        },
      },
    ],
    actions: Object.keys(rules).map((k) => ({
      name: "ModifyResponseHeader",
      parameters: {
        headerAction: "Overwrite",
        headerName: k,
        value: rules[k],
        typeName: "DeliveryRuleHeaderActionParameters",
      },
    })),
  };
};

export const allowsCorsRules = (
  cors: string[],
): native.types.input.cdn.DeliveryRuleArgs[] =>
  cors.map((c, i) => ({
    name: `allowsCors${i + 1}`,
    order: 5 + i,
    conditions: [
      {
        name: "RequestHeader",
        parameters: {
          typeName: "DeliveryRuleRequestHeaderConditionParameters",
          selector: "Origin",
          operator: "Contains",
          transforms: [],
          matchValues: [c],
          negateCondition: false,
        },
      },
    ],
    actions: [
      {
        name: "ModifyResponseHeader",
        parameters: {
          typeName: "DeliveryRuleHeaderActionParameters",
          headerAction: "Overwrite",
          headerName: "Access-Control-Allow-Origin",
          value: c,
        },
      },
    ],
  }));
