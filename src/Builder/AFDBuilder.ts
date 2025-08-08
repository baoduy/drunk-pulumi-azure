import * as cdn from '@pulumi/azure-native/cdn';
import * as frontdoor from '@pulumi/azure-native/frontdoor';
import * as pulumi from '@pulumi/pulumi';
import { ResourceInfo } from '../types';
import { naming, helpers } from '../Common';
import { PulumiCommand } from '@pulumi/pulumi/automation';
import {
  Builder,
  BuilderProps,
  AFDBuilderEndpoint,
  ResponseHeaderType,
  IAFDBuilder,
} from './types';

export class AFDBuilder extends Builder<ResourceInfo> implements IAFDBuilder {
  private _name: string;

  private _ruleSetRs: cdn.RuleSet | undefined;
  private _customDomainRs: cdn.AFDCustomDomain | undefined;
  private _profileRs: cdn.Profile | undefined;
  private _endpointRs: cdn.AFDEndpoint | undefined;

  private _sdk: string = cdn.SkuName.Standard_AzureFrontDoor;
  private _customDomain: string | undefined;

  private _endpointArgs: AFDBuilderEndpoint | undefined;
  private _responseHeaders: ResponseHeaderType[] | undefined;

  public constructor(props: BuilderProps) {
    super(props);
    this._name = naming.getCdnEndpointName(props.name);
  }

  public withSdk(sdk: cdn.SkuName): IAFDBuilder {
    this._sdk = sdk;
    return this;
  }

  public withCustomDomain(domain: string): IAFDBuilder {
    this._customDomain = domain;
    return this;
  }

  public withEndpoint(endpoint: AFDBuilderEndpoint): IAFDBuilder {
    this._endpointArgs = endpoint;
    return this;
  }

  public withResponseHeaders(headers: ResponseHeaderType[]): IAFDBuilder {
    this._responseHeaders = headers;
    return this;
  }

  private buildProfile() {
    this._profileRs = new cdn.Profile(this._name, {
      location: 'global',
      resourceGroupName: this.commonProps.group.resourceGroupName,
      originResponseTimeoutSeconds: 60,
      sku: {
        name: this._sdk,
      },
    });
  }

  private buildCustomDomain() {
    if (!this._customDomain) return;

    this._customDomainRs = new cdn.AFDCustomDomain(
      `${this._name}-custom-domain`,
      {
        profileName: this._profileRs!.name,
        resourceGroupName: this.commonProps.group.resourceGroupName,
        hostName: this._customDomain,
        tlsSettings: {
          certificateType: 'ManagedCertificate',
          minimumTlsVersion: 'TLS12',
        },
      },
      {
        dependsOn: this._profileRs,
      }
    );
  }

  private buildRuleSets() {
    if (!this._responseHeaders) return;

    this._ruleSetRs = new cdn.RuleSet(
      `${this._name}-response-headers`,
      {
        profileName: this._profileRs!.name,
        resourceGroupName: this.commonProps.group.resourceGroupName,
        ruleSetName: 'ResponseHeaders',
      },
      { dependsOn: this._profileRs }
    );

    new cdn.Rule(
      `${this._name}-response-headers-rule`,
      {
        profileName: this._profileRs!.name,
        resourceGroupName: this.commonProps.group.resourceGroupName,
        ruleSetName: this._ruleSetRs.name,
        ruleName: 'AddResponseHeaders',
        order: 100,
        actions: this._responseHeaders!.map((h) => ({
          name: 'ModifyResponseHeader',
          parameters: {
            typeName: 'DeliveryRuleHeaderActionParameters',
            headerAction: 'Append',
            headerName: h.header,
            value: h.value,
          },
        })),

        matchProcessingBehavior: 'Continue',
      },
      { dependsOn: [this._ruleSetRs, this._profileRs!] }
    );
  }

  private buildEndpoints() {
    if (!this._endpointArgs) return;

    this._endpointRs = new cdn.AFDEndpoint(
      `${this._name}-${this._endpointArgs.name}`,
      {
        profileName: this._profileRs!.name,
        resourceGroupName: this.commonProps.group.resourceGroupName,
        location: 'global',
        endpointName: this._endpointArgs.name,
        enabledState: 'Enabled',
      },
      {
        dependsOn: this._profileRs,
      }
    );

    const oGroup = new cdn.AFDOriginGroup(
      `${this._endpointArgs.name}-origin-group`,
      {
        profileName: this._profileRs!.name,
        resourceGroupName: this.commonProps.group.resourceGroupName,
        originGroupName: `${this._endpointArgs.name}-origin-group`,
        loadBalancingSettings: {
          sampleSize: 4,
          successfulSamplesRequired: 3,
          additionalLatencyInMilliseconds: 50,
        },
        healthProbeSettings: {
          probePath: '/',
          probeProtocol: 'Https',
          probeRequestType: 'HEAD',
          probeIntervalInSeconds: 120,
        },
        sessionAffinityState: 'Disabled',
      },
      {
        dependsOn: this._profileRs,
      }
    );

    const origin = new cdn.AFDOrigin(
      `${this._endpointArgs.name}-origin`,
      {
        originGroupName: oGroup.name,
        profileName: this._profileRs!.name,
        resourceGroupName: this.commonProps.group.resourceGroupName,
        hostName: pulumi
          .output(this._endpointArgs.origin)
          .apply((o) => helpers.getDomainFromUrl(o)),
        httpPort: 80,
        httpsPort: 443,
        priority: 1,
        weight: 1000,
        enabledState: 'Enabled',
        enforceCertificateNameCheck: true,
      },
      { dependsOn: [oGroup, this._profileRs!] }
    );

    const route = new cdn.Route(
      `${this._endpointArgs.name}-route`,
      {
        profileName: this._profileRs!.name,
        resourceGroupName: this.commonProps.group.resourceGroupName,
        endpointName: this._endpointRs!.name,
        originGroup: {
          id: oGroup.id,
        },
        customDomains: this._customDomainRs
          ? [
              {
                id: this._customDomainRs.id,
              },
            ]
          : undefined,
        ruleSets: this._ruleSetRs ? [{ id: this._ruleSetRs.id }] : undefined,

        supportedProtocols: ['Http', 'Https'],
        patternsToMatch: ['/*'],
        forwardingProtocol: 'HttpsOnly',
        linkToDefaultDomain: 'Disabled',
        httpsRedirect: 'Enabled',
        enabledState: 'Enabled',

        cacheConfiguration: {
          compressionSettings: {
            isCompressionEnabled: true,
            contentTypesToCompress: [
              'application/eot',
              'application/font',
              'application/font-sfnt',
              'application/javascript',
              'application/json',
              'application/opentype',
              'application/otf',
              'application/pkcs7-mime',
              'application/truetype',
              'application/ttf',
              'application/vnd.ms-fontobject',
              'application/xhtml+xml',
              'application/xml',
              'application/xml+rss',
              'application/x-font-opentype',
              'application/x-font-truetype',
              'application/x-font-ttf',
              'application/x-httpd-cgi',
              'application/x-javascript',
              'application/x-mpegurl',
              'application/x-opentype',
              'application/x-otf',
              'application/x-perl',
              'application/x-ttf',
              'font/eot',
              'font/ttf',
              'font/otf',
              'font/opentype',
              'image/svg+xml',
              'text/css',
              'text/csv',
              'text/html',
              'text/javascript',
              'text/js',
              'text/plain',
              'text/richtext',
              'text/tab-separated-values',
              'text/xml',
              'text/x-script',
              'text/x-component',
              'text/x-java-source',
            ],
          },
          queryStringCachingBehavior: 'IgnoreQueryString',
        },
      },
      { dependsOn: [oGroup, origin, this._endpointRs, this._profileRs!] }
    );
  }

  private buildWAF() {
    if (!this._endpointRs) return;

    const waf = new frontdoor.Policy(
      `${this._name}-waf-policy`,
      {
        resourceGroupName: this.commonProps.group.resourceGroupName,
        location: 'global',
        sku: { name: this._sdk },
        policyName: `${helpers.replaceAll(this._name, '-', '')}waf`,
        policySettings: {
          mode: frontdoor.PolicyMode.Prevention,
          state: 'Enabled',
        },
        managedRules: {
          managedRuleSets: [],
        },
      },
      {
        dependsOn: this._profileRs,
        ignoreChanges: ['managedRules', 'customRules'],
      }
    );

    new cdn.SecurityPolicy(
      `${this._name}-waf-policy`,
      {
        resourceGroupName: this.commonProps.group.resourceGroupName,
        securityPolicyName: `${this._name}-waf-policy`,
        profileName: this._profileRs!.name,
        parameters: {
          type: 'WebApplicationFirewall',
          wafPolicy: { id: waf.id },
          associations: [
            {
              domains: [
                {
                  id: this._endpointRs.id,
                },
              ],
              patternsToMatch: ['/*'],
            },
          ],
        },
      },
      { dependsOn: waf }
    ); // Example bot names
  }

  public build(): ResourceInfo {
    this.buildProfile();
    this.buildCustomDomain();
    this.buildRuleSets();
    this.buildEndpoints();
    this.buildWAF();

    return {
      group: this.commonProps.group,
      name: this._name,
      id: this._profileRs!.id,
    };
  }
}

export default (props: BuilderProps) => new AFDBuilder(props) as IAFDBuilder;
