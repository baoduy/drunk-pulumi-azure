import * as msRest from '@azure/ms-rest-js';
import { WebResource } from '@azure/ms-rest-js';
import * as msRestAzure from '@azure/ms-rest-nodeauth';
import * as native from '@pulumi/azure-native';
import { ClientSecretCredential, TokenCredential } from '@azure/identity';

export class ClientCredential implements TokenCredential {
  credential!: ClientSecretCredential;

  getCredentials() {
    if (this.credential) return this.credential;

    let clientID = native.config.clientId;
    let clientSecret = native.config.clientSecret;
    let tenantID = native.config.tenantId;
    let subscriptionID = native.config.subscriptionId;

    // If at least one of them is empty, try looking at the env vars.
    if (!clientID || !clientSecret || !tenantID || !subscriptionID) {
      //console.log('ClientCredential: getting auth info from ARM.');

      clientID = process.env['ARM_CLIENT_ID'];
      clientSecret = process.env['ARM_CLIENT_SECRET'];
      tenantID = process.env['ARM_TENANT_ID'];
      subscriptionID = process.env['ARM_SUBSCRIPTION_ID'];
    }

    if (tenantID && clientID && clientSecret) {
      this.credential = new ClientSecretCredential(
        tenantID,
        clientID,
        clientSecret
      );
    }
    return this.credential;
  }

  async getToken(
    scopes: string | string[],
    options?: import('@azure/core-auth').GetTokenOptions | undefined
  ): Promise<import('@azure/core-auth').AccessToken | null> {
    const cre = this.getCredentials();
    if (cre) return cre.getToken(scopes, options);

    const resource = Array.isArray(scopes) ? scopes[0] : scopes;
    const token = await msRestAzure.AzureCliCredentials.getAccessToken({
      resource: resource.replace('/.default', ''),
    });

    return {
      token: token.accessToken,
      expiresOnTimestamp: 30,
    };
  }
}

export class InternalCredentials implements msRest.ServiceClientCredentials {
  private credentials!:
    | msRestAzure.AzureCliCredentials
    | msRestAzure.ApplicationTokenCredentials;
  public subscriptionID!: string | undefined;
  public tenantID!: string | undefined;

  constructor() {
    this.getCredentials().catch();
  }

  public async getCredentials(): Promise<
    msRestAzure.AzureCliCredentials | msRestAzure.ApplicationTokenCredentials
  > {
    if (this.credentials) return this.credentials;

    let clientID = native.config.clientId;
    let clientSecret = native.config.clientSecret;
    this.tenantID = native.config.tenantId;
    this.subscriptionID = native.config.subscriptionId;

    // If at least one of them is empty, try looking at the env vars.
    if (!clientID || !clientSecret || !this.tenantID || !this.subscriptionID) {
      //console.log('ClientCredential: getting auth info from ARM.');

      clientID = process.env['ARM_CLIENT_ID'];
      clientSecret = process.env['ARM_CLIENT_SECRET'];
      this.tenantID = process.env['ARM_TENANT_ID'];
      this.subscriptionID = process.env['ARM_SUBSCRIPTION_ID'];
    }

    // If they are still empty, try to get the credentials from Az CLI.
    if (!clientID || !clientSecret || !this.tenantID || !this.subscriptionID) {
      //console.log('ClientCredential: getting auth info from Azure CLI.');
      // `create()` will throw an error if the Az CLI is not installed or `az login` has never been run.
      const cliCredentials = await msRestAzure.AzureCliCredentials.create();
      this.subscriptionID =
        cliCredentials.tokenInfo.subscription ||
        cliCredentials.subscriptionInfo.id;
      this.tenantID = cliCredentials.tokenInfo.tenant;
      this.credentials = cliCredentials;
    } else {
      this.credentials = await msRestAzure.loginWithServicePrincipalSecret(
        clientID,
        clientSecret,
        this.tenantID
      );
    }

    return this.credentials;
  }

  /** Fixed some incompatible issue */
  public async signRequest(webResource: WebResource): Promise<WebResource> {
    return await (await this.getCredentials()).signRequest(webResource);
  }

  public async getToken() {
    const c = await this.getCredentials();
    const token = await c.getToken();
    console.log('getToken', token);
    return token.accessToken;
  }
}
