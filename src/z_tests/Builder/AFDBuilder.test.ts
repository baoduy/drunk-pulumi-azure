import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as cdn from '@pulumi/azure-native/cdn';
import creator from '../../Builder/AFDBuilder';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

const PROFILE_TYPE = 'azure-native:cdn:Profile';
const CUSTOM_DOMAIN_TYPE = 'azure-native:cdn:AFDCustomDomain';
const RULE_SET_TYPE = 'azure-native:cdn:RuleSet';
const RULE_TYPE = 'azure-native:cdn:Rule';
const ENDPOINT_TYPE = 'azure-native:cdn:AFDEndpoint';
const ORIGIN_GROUP_TYPE = 'azure-native:cdn:AFDOriginGroup';
const ORIGIN_TYPE = 'azure-native:cdn:AFDOrigin';
const ROUTE_TYPE = 'azure-native:cdn:Route';
const WAF_POLICY_TYPE = 'azure-native:frontdoor:Policy';
const SECURITY_POLICY_TYPE = 'azure-native:cdn:SecurityPolicy';

const group = { resourceGroupName: 'RG' };

describe('AFDBuilder', () => {
  it('build() creates a profile with default Standard SKU and returns its ResourceInfo', async () => {
    const before = createdResources.length;

    const result = creator({ name: 'afd-default', group }).build();

    const inputs = await waitForResource(PROFILE_TYPE, before);
    assert.strictEqual(inputs.sku.name, cdn.SkuName.Standard_AzureFrontDoor);
    assert.strictEqual(result.group, group);
    assert.ok(result.id, 'expected build() to return a profile id');
  });

  it('withSdk overrides the profile SKU', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-premium', group })
      .withSdk(cdn.SkuName.Premium_AzureFrontDoor)
      .build();

    const inputs = await waitForResource(PROFILE_TYPE, before);
    assert.strictEqual(inputs.sku.name, cdn.SkuName.Premium_AzureFrontDoor);
  });

  it('withCustomDomains creates one AFDCustomDomain per domain', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-domains', group })
      .withCustomDomains(['example.com', 'api.example.com'])
      .build();

    for (let i = 0; i < 50; i++) {
      const found = createdResources
        .slice(before)
        .filter((r) => r.type === CUSTOM_DOMAIN_TYPE);
      if (found.length >= 2) break;
      await new Promise((resolve) => setImmediate(resolve));
    }

    const domainResources = createdResources
      .slice(before)
      .filter((r) => r.type === CUSTOM_DOMAIN_TYPE);
    const hostNames = domainResources.map((r) => r.inputs.hostName).sort();
    assert.deepStrictEqual(hostNames, ['api.example.com', 'example.com']);
  });

  it('no custom domains configured: no AFDCustomDomain is created', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-nodomains', group }).build();
    await waitForResource(PROFILE_TYPE, before);

    assert.strictEqual(
      createdResources.slice(before).some((r) => r.type === CUSTOM_DOMAIN_TYPE),
      false
    );
  });

  it('withCustomDomainsIf(false, ...) does not apply the domains', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-domainsif-false', group })
      .withCustomDomainsIf(false, ['skip.example.com'])
      .build();
    await waitForResource(PROFILE_TYPE, before);

    assert.strictEqual(
      createdResources.slice(before).some((r) => r.type === CUSTOM_DOMAIN_TYPE),
      false
    );
  });

  it('withCustomDomainsIf(true, ...) applies the domains', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-domainsif-true', group })
      .withCustomDomainsIf(true, ['apply.example.com'])
      .build();

    const inputs = await waitForResource(CUSTOM_DOMAIN_TYPE, before);
    assert.strictEqual(inputs.hostName, 'apply.example.com');
  });

  it('no response headers configured: no RuleSet/Rule is created', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-noheaders', group }).build();
    await waitForResource(PROFILE_TYPE, before);

    assert.strictEqual(
      createdResources.slice(before).some((r) => r.type === RULE_SET_TYPE),
      false
    );
  });

  it('withResponseHeaders creates a RuleSet and a header-append Rule', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-headers', group })
      .withResponseHeaders({ 'x-frame-options': 'DENY' })
      .build();

    await waitForResource(RULE_SET_TYPE, before);
    const ruleInputs = await waitForResource(RULE_TYPE, before);

    assert.strictEqual(ruleInputs.actions.length, 1);
    assert.strictEqual(
      ruleInputs.actions[0].parameters.headerName,
      'x-frame-options'
    );
    assert.strictEqual(ruleInputs.actions[0].parameters.value, 'DENY');
    assert.strictEqual(
      ruleInputs.actions[0].parameters.headerAction,
      'Append'
    );
  });

  it('withResponseHeadersIf(true, ...) applies the headers', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-headersif-true', group })
      .withResponseHeadersIf(true, { 'x-test': 'value' })
      .build();

    const ruleInputs = await waitForResource(RULE_TYPE, before);
    assert.strictEqual(ruleInputs.actions[0].parameters.headerName, 'x-test');
  });

  it('withResponseHeadersIf(false, ...) does not apply the headers', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-headersif-false', group })
      .withResponseHeadersIf(false, { 'x-test': 'value' })
      .build();
    await waitForResource(PROFILE_TYPE, before);

    assert.strictEqual(
      createdResources.slice(before).some((r) => r.type === RULE_SET_TYPE),
      false
    );
  });

  it('no endpoint configured: no endpoint, origin, route, or WAF is created', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-noendpoint', group }).build();
    await waitForResource(PROFILE_TYPE, before);

    const created = createdResources.slice(before).map((r) => r.type);
    assert.strictEqual(created.includes(ENDPOINT_TYPE), false);
    assert.strictEqual(created.includes(ORIGIN_GROUP_TYPE), false);
    assert.strictEqual(created.includes(ORIGIN_TYPE), false);
    assert.strictEqual(created.includes(ROUTE_TYPE), false);
    assert.strictEqual(created.includes(WAF_POLICY_TYPE), false);
    assert.strictEqual(created.includes(SECURITY_POLICY_TYPE), false);
  });

  it('withEndpoint creates the endpoint, origin group, origin, route, and a WAF policy wired to the endpoint', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-endpoint', group })
      .withEndpoint({ name: 'ep1', origin: 'https://origin.example.com/path' })
      .build();

    const endpointInputs = await waitForResource(ENDPOINT_TYPE, before);
    assert.strictEqual(endpointInputs.endpointName, 'ep1');
    assert.strictEqual(endpointInputs.enabledState, 'Enabled');

    const originInputs = await waitForResource(ORIGIN_TYPE, before);
    assert.strictEqual(originInputs.hostName, 'origin.example.com');

    const routeInputs = await waitForResource(ROUTE_TYPE, before);
    assert.strictEqual(routeInputs.linkToDefaultDomain, 'Disabled');
    assert.strictEqual(routeInputs.httpsRedirect, 'Enabled');

    const wafInputs = await waitForResource(WAF_POLICY_TYPE, before);
    assert.strictEqual(wafInputs.policySettings.mode, 'Prevention');

    const securityPolicyInputs = await waitForResource(
      SECURITY_POLICY_TYPE,
      before
    );
    assert.strictEqual(
      securityPolicyInputs.parameters.type,
      'WebApplicationFirewall'
    );
  });

  it('withEndpointIf(true, ...) builds an endpoint', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-endpointif-true', group })
      .withEndpointIf(true, {
        name: 'ep-if-true',
        origin: 'https://origin.example.com',
      })
      .build();

    const endpointInputs = await waitForResource(ENDPOINT_TYPE, before);
    assert.strictEqual(endpointInputs.endpointName, 'ep-if-true');
  });

  it('withEndpointIf(false, ...) does not build an endpoint', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-endpointif-false', group })
      .withEndpointIf(false, {
        name: 'ep2',
        origin: 'https://skip.example.com',
      })
      .build();
    await waitForResource(PROFILE_TYPE, before);

    assert.strictEqual(
      createdResources.slice(before).some((r) => r.type === ENDPOINT_TYPE),
      false
    );
  });

  it('route references custom domains and rule sets when both are configured alongside an endpoint', async () => {
    const before = createdResources.length;

    creator({ name: 'afd-full', group })
      .withCustomDomains(['full.example.com'])
      .withResponseHeaders({ 'x-test': 'value' })
      .withEndpoint({ name: 'ep3', origin: 'https://origin.example.com' })
      .build();

    const routeInputs = await waitForResource(ROUTE_TYPE, before);
    assert.strictEqual(routeInputs.customDomains.length, 1);
    assert.strictEqual(routeInputs.ruleSets.length, 1);
  });
});
