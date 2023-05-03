import * as msRestAzure from '@azure/ms-rest-nodeauth';
import * as native from '@pulumi/azure-native';
import { ClientSecretCredential, TokenCredential } from '@azure/identity';

type WebResource = { headers: { set: (key: string, value: string) => void } };

export class ClientCredential implements TokenCredential {
  public subscriptionID: string | undefined = undefined;

  private async getCredentials() {
    let clientID = native.config.clientId;
    let clientSecret = native.config.clientSecret;
    let tenantID = native.config.tenantId;
    this.subscriptionID = native.config.subscriptionId;

    // If at least one of them is empty, try looking at the env vars.
    if (!clientID || !clientSecret || !tenantID) {
      clientID = process.env['ARM_CLIENT_ID'];
      clientSecret = process.env['ARM_CLIENT_SECRET'];
      tenantID = process.env['ARM_TENANT_ID'];
      this.subscriptionID = process.env['ARM_SUBSCRIPTION_ID'];
    }

    if (tenantID && clientID && clientSecret) {
      return new ClientSecretCredential(tenantID, clientID, clientSecret);
    } else {
      const cli = await msRestAzure.AzureCliCredentials.create();
      this.subscriptionID =
        cli.tokenInfo.subscription ?? cli.subscriptionInfo.id;
      return cli;
    }
  }

  public async getToken(
    scopes: string | string[] = [
      'https://graph.microsoft.com/.default',
      'https://management.azure.com/.default',
    ],
    options?: import('@azure/core-auth').GetTokenOptions | undefined
  ): Promise<import('@azure/core-auth').AccessToken | null> {
    const cre = await this.getCredentials();
    if (cre instanceof ClientSecretCredential)
      return await cre.getToken(scopes, options);
    const token = await cre.getToken();

    return {
      token: token.accessToken,
      expiresOnTimestamp: 30,
    };
  }

  public async signRequest(webResource: WebResource): Promise<WebResource> {
    const tokenResponse = await this.getToken();
    webResource.headers.set(
      'Authorization',
      `Brear ${tokenResponse?.token || ''}`
    );
    return webResource;
  }
}
